/**
 * POST /api/contact
 * Reçoit la soumission du formulaire de contact (contact.html), l'enregistre
 * dans la base D1 (binding "DB"), puis envoie une notification par email
 * via Resend (best-effort — un échec d'email ne fait jamais échouer
 * l'enregistrement du message).
 */

const SERVICE_LABELS = {
  developpement: "Développement web",
  design: "Design graphique / Identité visuelle",
  marketing: "Marketing digital / Réseaux sociaux",
  autre: "Autre / Plusieurs services",
};

export async function onRequestPost(context) {
  const { request, env } = context;

  let form;
  try {
    form = await request.formData();
  } catch (err) {
    return jsonResponse({ ok: false, error: "invalid_form_data" }, 400);
  }

  // Honeypot anti-spam : champ invisible, jamais rempli par un humain.
  // On répond "succès" sans rien enregistrer pour ne pas alerter le bot.
  if (clean(form.get("_gotcha"))) {
    return jsonResponse({ ok: true });
  }

  const data = {
    nom: clean(form.get("nom")),
    email: clean(form.get("email")),
    entreprise: clean(form.get("entreprise")),
    service: clean(form.get("service")),
    budget: clean(form.get("budget")),
    delai: clean(form.get("delai")),
    message: clean(form.get("message")),
  };

  if (!data.nom || !data.email || !data.service || !data.message) {
    return jsonResponse({ ok: false, error: "missing_fields" }, 400);
  }
  if (!isValidEmail(data.email)) {
    return jsonResponse({ ok: false, error: "invalid_email" }, 400);
  }

  if (!env.DB) {
    // Base D1 pas encore liée au projet Pages (voir GUIDE-MESSAGES.md étape 2)
    return jsonResponse({ ok: false, error: "database_not_configured" }, 500);
  }

  const createdAt = new Date().toISOString();

  try {
    await env.DB.prepare(
      `INSERT INTO messages (created_at, nom, email, entreprise, service, budget, delai, message, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'nouveau')`
    )
      .bind(
        createdAt,
        data.nom,
        data.email,
        data.entreprise,
        data.service,
        data.budget,
        data.delai,
        data.message
      )
      .run();
  } catch (err) {
    return jsonResponse({ ok: false, error: "database_error" }, 500);
  }

  // L'email de notification ne doit jamais bloquer ni ralentir la réponse
  // au visiteur : on la lance en arrière-plan avec waitUntil.
  context.waitUntil(sendNotificationEmail(env, data));

  return jsonResponse({ ok: true });
}

function clean(value) {
  return (value == null ? "" : String(value)).trim().slice(0, 5000);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function sendNotificationEmail(env, data) {
  if (!env.RESEND_API_KEY || !env.NOTIFY_EMAIL) return;

  const from = env.FROM_EMAIL || "Portfolio <onboarding@resend.dev>";
  const serviceLabel = SERVICE_LABELS[data.service] || data.service;

  const html = `
    <h2 style="font-family:sans-serif;">Nouveau message — portfolio</h2>
    <p style="font-family:sans-serif;"><strong>${escapeHtml(data.nom)}</strong> — ${escapeHtml(data.email)}</p>
    ${data.entreprise ? `<p style="font-family:sans-serif;">Entreprise : ${escapeHtml(data.entreprise)}</p>` : ""}
    <p style="font-family:sans-serif;">Service : ${escapeHtml(serviceLabel)}</p>
    ${data.budget ? `<p style="font-family:sans-serif;">Budget : ${escapeHtml(data.budget)}</p>` : ""}
    ${data.delai ? `<p style="font-family:sans-serif;">Délai : ${escapeHtml(data.delai)}</p>` : ""}
    <p style="font-family:sans-serif;white-space:pre-wrap;">${escapeHtml(data.message)}</p>
    <p style="font-family:sans-serif;color:#888;font-size:12px;">Gère ce message depuis /admin/messages.html</p>
  `;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [env.NOTIFY_EMAIL],
        reply_to: data.email,
        subject: `Nouvelle demande — ${data.nom}`,
        html,
      }),
    });
  } catch (err) {
    // Silencieux : le message est déjà en sécurité dans la base D1,
    // consultable depuis le dashboard même si l'email a échoué.
  }
}
