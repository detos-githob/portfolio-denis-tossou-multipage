/**
 * Worker du portfolio — gère uniquement les adresses /api/*.
 * Tout le reste (pages, images, CSS…) est servi directement par Cloudflare
 * à partir des fichiers du site (voir "assets" dans wrangler.jsonc).
 *
 *   POST   /api/contact        formulaire de contact
 *   GET    /api/messages       liste des messages      ┐ réservées à toi :
 *   PATCH  /api/messages/:id   changer le statut       │ protégées par
 *   DELETE /api/messages/:id   supprimer               ┘ Cloudflare Access
 *
 * Variables (Cloudflare → le projet → Settings → Variables and Secrets) :
 *   NOTIFY_EMAIL        adresse qui reçoit les messages (texte)
 *   RESEND_API_KEY      clé API Resend (Secret)
 *   FROM_EMAIL          optionnel, ex. "Portfolio <contact@denistossou.com>"
 *   ACCESS_TEAM_DOMAIN  optionnel, ex. "denistossou.cloudflareaccess.com"  ┐ pour le tableau
 *   ACCESS_AUD          optionnel, l'« Application Audience (AUD) Tag »     ┘ de bord des messages
 * Liaison optionnelle : base D1 nommée DB (voir GUIDE-MESSAGES.md).
 *
 * Sans base D1, le formulaire fonctionne quand même : chaque message t'est envoyé par email.
 */

const SERVICE_LABELS = {
  developpement: 'Développement web',
  design: 'Design graphique / Identité visuelle',
  marketing: 'Marketing digital / Réseaux sociaux',
  autre: 'Autre / Plusieurs services',
};
const VALID_STATUSES = ['nouveau', 'lu', 'traite'];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '');

    try {
      if (path === '/api/contact') {
        if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405, { Allow: 'POST' });
        return await handleContact(request, env, ctx);
      }

      if (path === '/api/messages' || path.startsWith('/api/messages/')) {
        const denied = await requireAccess(request, env);
        if (denied) return denied;
        if (path === '/api/messages') {
          if (request.method !== 'GET') return json({ ok: false, error: 'method_not_allowed' }, 405, { Allow: 'GET' });
          return await listMessages(url, env);
        }
        const id = Number(path.slice('/api/messages/'.length));
        if (!Number.isInteger(id) || id <= 0) return json({ ok: false, error: 'invalid_id' }, 400);
        if (request.method === 'PATCH') return await updateMessage(request, env, id);
        if (request.method === 'DELETE') return await deleteMessage(env, id);
        return json({ ok: false, error: 'method_not_allowed' }, 405, { Allow: 'PATCH, DELETE' });
      }

      if (path.startsWith('/api/')) return json({ ok: false, error: 'not_found' }, 404);
    } catch (err) {
      console.error('Erreur API', path, err);
      return json({ ok: false, error: 'server_error' }, 500);
    }

    // Tout le reste : fichiers du site
    return env.ASSETS.fetch(request);
  },
};

/* ------------------------------------------------------------------ formulaire */

async function handleContact(request, env, ctx) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: 'invalid_form_data' }, 400);
  }

  // Champ piège invisible : seul un robot le remplit. On répond « succès » sans rien faire.
  if (clean(form.get('_gotcha'))) return json({ ok: true });

  const data = {
    nom: clean(form.get('nom'), 200),
    email: clean(form.get('email'), 200),
    entreprise: clean(form.get('entreprise'), 200),
    service: clean(form.get('service'), 50),
    budget: clean(form.get('budget'), 50),
    delai: clean(form.get('delai'), 50),
    message: clean(form.get('message')),
  };

  if (!data.nom || !data.email || !data.service || !data.message) return json({ ok: false, error: 'missing_fields' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return json({ ok: false, error: 'invalid_email' }, 400);

  const emailReady = Boolean(env.RESEND_API_KEY && env.NOTIFY_EMAIL);

  if (env.DB) {
    // Avec base : le message est enregistré, l'email part en arrière-plan.
    await env.DB.prepare(
      `INSERT INTO messages (created_at, nom, email, entreprise, service, budget, delai, message, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'nouveau')`
    ).bind(new Date().toISOString(), data.nom, data.email, data.entreprise, data.service, data.budget, data.delai, data.message).run();
    if (emailReady) ctx.waitUntil(sendEmail(env, data).catch((e) => console.error('Email non envoyé :', e.message)));
    return json({ ok: true });
  }

  // Sans base : l'email est le seul moyen de recevoir le message, il doit réussir.
  if (!emailReady) {
    console.error('Formulaire : ni base D1 (DB) ni variables RESEND_API_KEY / NOTIFY_EMAIL configurées.');
    return json({ ok: false, error: 'not_configured' }, 503);
  }
  try {
    await sendEmail(env, data);
  } catch (e) {
    console.error('Email non envoyé :', e.message);
    return json({ ok: false, error: 'email_failed' }, 502);
  }
  return json({ ok: true });
}

async function sendEmail(env, data) {
  const service = SERVICE_LABELS[data.service] || data.service;
  const row = (label, value) => (value ? `<p style="font-family:sans-serif;margin:4px 0;"><strong>${label} :</strong> ${esc(value)}</p>` : '');
  const html = `
    <h2 style="font-family:sans-serif;">Nouveau message depuis denistossou.com</h2>
    ${row('Nom', data.nom)}${row('Email', data.email)}${row('Entreprise / projet', data.entreprise)}
    ${row('Service', service)}${row('Budget', data.budget)}${row('Délai', data.delai)}
    <p style="font-family:sans-serif;white-space:pre-wrap;border-left:3px solid #f4841e;padding-left:12px;">${esc(data.message)}</p>
    <p style="font-family:sans-serif;color:#888;font-size:12px;">Réponds directement à cet email pour écrire à ${esc(data.nom)}.</p>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.FROM_EMAIL || 'Portfolio Denis Tossou <onboarding@resend.dev>',
      to: [env.NOTIFY_EMAIL],
      reply_to: data.email,
      subject: `Nouvelle demande — ${data.nom}${data.entreprise ? ' (' + data.entreprise + ')' : ''}`,
      html,
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status} : ${(await res.text()).slice(0, 300)}`);
}

/* ------------------------------------------------------------------ tableau de bord des messages */

async function listMessages(url, env) {
  if (!env.DB) return json({ ok: false, error: 'database_not_configured' }, 500);
  const status = url.searchParams.get('status');
  let query = 'SELECT id, created_at, nom, email, entreprise, service, budget, delai, message, status FROM messages';
  const binds = [];
  if (VALID_STATUSES.includes(status)) { query += ' WHERE status = ?'; binds.push(status); }
  query += ' ORDER BY created_at DESC';
  const { results } = await env.DB.prepare(query).bind(...binds).all();
  return json({ ok: true, items: results });
}

async function updateMessage(request, env, id) {
  if (!env.DB) return json({ ok: false, error: 'database_not_configured' }, 500);
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'invalid_body' }, 400); }
  if (!VALID_STATUSES.includes(body && body.status)) return json({ ok: false, error: 'invalid_status' }, 400);
  await env.DB.prepare('UPDATE messages SET status = ? WHERE id = ?').bind(body.status, id).run();
  return json({ ok: true });
}

async function deleteMessage(env, id) {
  if (!env.DB) return json({ ok: false, error: 'database_not_configured' }, 500);
  await env.DB.prepare('DELETE FROM messages WHERE id = ?').bind(id).run();
  return json({ ok: true });
}

/* ------------------------------------------------------------------ protection Cloudflare Access */

/** Vérifie le jeton signé que Cloudflare Access ajoute à chaque requête autorisée.
 *  Sans configuration Access, les routes /api/messages restent fermées (sécurité par défaut). */
async function requireAccess(request, env) {
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return json({ ok: false, error: 'access_not_configured' }, 403);
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) return json({ ok: false, error: 'unauthorized' }, 401);
  try {
    await verifyAccessJwt(token, env.ACCESS_TEAM_DOMAIN.replace(/^https?:\/\//, '').replace(/\/+$/, ''), env.ACCESS_AUD);
    return null;
  } catch (e) {
    console.warn('Jeton Access refusé :', e.message);
    return json({ ok: false, error: 'unauthorized' }, 401);
  }
}

const b64urlToBytes = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const b64urlToJson = (s) => JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));

async function verifyAccessJwt(token, teamDomain, aud) {
  const [h, p, sig] = token.split('.');
  if (!h || !p || !sig) throw new Error('format');
  const header = b64urlToJson(h);
  const payload = b64urlToJson(p);
  if (header.alg !== 'RS256') throw new Error('algorithme');
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) throw new Error('expiré');
  if (payload.iss !== `https://${teamDomain}`) throw new Error('émetteur');
  if (!(Array.isArray(payload.aud) ? payload.aud : [payload.aud]).includes(aud)) throw new Error('audience');

  const certs = await (await fetch(`https://${teamDomain}/cdn-cgi/access/certs`, { cf: { cacheTtl: 3600 } })).json();
  const jwk = (certs.keys || []).find((k) => k.kid === header.kid);
  if (!jwk) throw new Error('clé inconnue');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(sig), new TextEncoder().encode(`${h}.${p}`));
  if (!valid) throw new Error('signature');
}

/* ------------------------------------------------------------------ utilitaires */

function clean(value, max = 5000) {
  return (value == null ? '' : String(value)).trim().slice(0, max);
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}
