/**
 * PATCH  /api/messages/:id   body: { "status": "nouveau" | "lu" | "traite" }
 * DELETE /api/messages/:id
 *
 * Comme /api/messages, ces routes sont destinées à être protégées par
 * Cloudflare Access (voir GUIDE-MESSAGES.md).
 */

const VALID_STATUSES = ["nouveau", "lu", "traite"];

export async function onRequestPatch(context) {
  const { env, request, params } = context;

  if (!env.DB) {
    return jsonResponse({ ok: false, error: "database_not_configured" }, 500);
  }

  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return jsonResponse({ ok: false, error: "invalid_id" }, 400);
  }

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return jsonResponse({ ok: false, error: "invalid_body" }, 400);
  }

  const status = body && body.status;
  if (!VALID_STATUSES.includes(status)) {
    return jsonResponse({ ok: false, error: "invalid_status" }, 400);
  }

  try {
    await env.DB.prepare("UPDATE messages SET status = ? WHERE id = ?").bind(status, id).run();
    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: "database_error" }, 500);
  }
}

export async function onRequestDelete(context) {
  const { env, params } = context;

  if (!env.DB) {
    return jsonResponse({ ok: false, error: "database_not_configured" }, 500);
  }

  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return jsonResponse({ ok: false, error: "invalid_id" }, 400);
  }

  try {
    await env.DB.prepare("DELETE FROM messages WHERE id = ?").bind(id).run();
    return jsonResponse({ ok: true });
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
