/**
 * Cloudflare Worker — passerelle d'authentification GitHub pour Decap CMS.
 *
 * Ce Worker fait le lien entre le panneau d'admin (/admin sur ton site) et GitHub :
 * il redirige vers la page de connexion GitHub, puis renvoie un jeton d'accès
 * au panneau d'admin une fois la connexion validée. Il ne stocke jamais rien.
 *
 * Variables d'environnement à créer (Cloudflare Dashboard > ton Worker > Settings > Variables) :
 *   - GITHUB_CLIENT_ID     (valeur depuis ta GitHub OAuth App)
 *   - GITHUB_CLIENT_SECRET (valeur depuis ta GitHub OAuth App — à chiffrer/"Encrypt")
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Étape 1 : on redirige l'utilisateur vers GitHub pour se connecter
    if (url.pathname === "/auth") {
      const state = crypto.randomUUID();
      const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
      authorizeUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
      authorizeUrl.searchParams.set("redirect_uri", `${url.origin}/callback`);
      authorizeUrl.searchParams.set("scope", "repo,user");
      authorizeUrl.searchParams.set("state", state);

      return new Response(null, {
        status: 302,
        headers: {
          Location: authorizeUrl.toString(),
          "Set-Cookie": `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
        },
      });
    }

    // Étape 2 : GitHub nous renvoie ici avec un code, qu'on échange contre un jeton
    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const cookieHeader = request.headers.get("Cookie") || "";
      const match = cookieHeader.match(/oauth_state=([^;]+)/);
      const savedState = match ? match[1] : null;

      if (!code || !state || state !== savedState) {
        return new Response(
          "Connexion refusée : état de sécurité invalide. Réessaie de te connecter depuis /admin.",
          { status: 400 }
        );
      }

      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });
      const tokenData = await tokenRes.json();

      if (!tokenData.access_token) {
        return new Response(
          "Impossible d'obtenir un jeton GitHub : " + JSON.stringify(tokenData),
          { status: 400 }
        );
      }

      // On renvoie une petite page qui transmet le jeton au panneau d'admin
      // via postMessage, selon le protocole attendu par Decap CMS.
      const payload = JSON.stringify({ token: tokenData.access_token, provider: "github" });
      const html = `<!DOCTYPE html>
<html><body>
<script>
(function() {
  function receiveMessage(e) {
    window.opener.postMessage(
      'authorization:github:success:${payload}',
      e.origin
    );
    window.removeEventListener("message", receiveMessage, false);
  }
  window.addEventListener("message", receiveMessage, false);
  window.opener.postMessage("authorizing:github", "*");
})();
</script>
Connexion réussie, tu peux fermer cette fenêtre si elle ne se ferme pas automatiquement.
</body></html>`;

      return new Response(html, {
        headers: { "Content-Type": "text/html;charset=UTF-8" },
      });
    }

    return new Response(
      "Passerelle d'authentification Decap CMS. Routes disponibles : /auth et /callback.",
      { status: 200 }
    );
  },
};
