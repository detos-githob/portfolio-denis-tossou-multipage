/**
 * GET /api/messages
 * Liste les messages reçus, du plus récent au plus ancien.
 * Filtre optionnel : /api/messages?status=nouveau|lu|traite
 *
 * Cette route est destinée à être protégée par une application
 * Cloudflare Access (voir GUIDE-MESSAGES.md) — elle ne fait volontairement
 * aucune vérification d'identité elle-même.
 */

const VALID_STATUSES = ["nouveau", "lu", "traite"];

export async function onRequestGet(context) {
  const { env, request } = context;

  if (!env.DB) {
    return jsonResponse({ ok: false, error: "database_not_configured" }, 500);
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status");

  try {
    let query =
      "SELECT id, created_at, nom, email, entreprise, service, budget, delai, message, status FROM messages";
    const binds = [];

    if (status && VALID_STATUSES.includes(status)) {
      query += " WHERE status = ?";
      binds.push(status);
    }
    query += " ORDER BY created_at DESC";

    const stmt = env.DB.prepare(query);
    const { results } = binds.length ? await stmt.bind(...binds).all() : await stmt.all();

    return jsonResponse({ ok: true, items: results });
  } catch (err) {
    return jsonResponse({ ok: false, error: "database_error" }, 500);
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
