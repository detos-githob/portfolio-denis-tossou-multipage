# Guide — Formulaire de contact et tableau de bord des messages

## Comment ça marche

Le formulaire de `/contact` envoie les données à `/api/contact`, géré par le Worker
`src/worker.js` (déployé automatiquement par Cloudflare à chaque `git push`).

- **Mode email (minimum)** : chaque message t'est envoyé par email via Resend.
- **Mode base de données (optionnel)** : en plus, chaque message est enregistré dans une
  base Cloudflare D1, et tu le retrouves dans le tableau de bord `/admin/messages`.

---

## Étape 1 — Activer l'envoi par email (obligatoire)

1. Sur [resend.com](https://resend.com) → **API Keys** → crée une clé (elle commence par `re_`).
2. Cloudflare → **Workers & Pages** → `portfolio-denis-tossou-multipage` → **Settings** →
   **Variables and Secrets** (la section du Worker, *pas* celle de « Build ») → **Add** :
   - `NOTIFY_EMAIL` — type **Text** — l'adresse qui reçoit les messages
   - `RESEND_API_KEY` — type **Secret** — la clé Resend
3. **Deploy**.

> Avec l'expéditeur par défaut `onboarding@resend.dev`, Resend n'envoie qu'à l'adresse
> de ton compte Resend : `NOTIFY_EMAIL` doit donc être cette même adresse. Pour envoyer
> depuis `contact@denistossou.com`, vérifie ton domaine dans Resend (**Domains**), puis
> ajoute la variable `FROM_EMAIL` = `Portfolio Denis Tossou <contact@denistossou.com>`.

Test : envoie un message depuis `/contact`. En cas d'échec, l'onglet **Observability**
du projet indique la cause (clé invalide, adresse non autorisée…).

## Étape 2 — Enregistrer les messages dans une base D1 (optionnel)

1. Cloudflare → **Storage & Databases** → **D1** → **Create database** → nom :
   `portfolio-messages`.
2. Ouvre la base → **Console** → colle le contenu de `src/schema.sql` → **Execute**.
3. Copie le **Database ID** de la base.
4. Dans `wrangler.jsonc`, décommente le bloc `d1_databases` et colle l'identifiant,
   puis `git commit` et `git push`.

## Étape 3 — Protéger le tableau de bord (obligatoire si tu utilises l'étape 2)

Les adresses `/api/messages` restent **fermées** tant que cette étape n'est pas faite.

1. Cloudflare → **Zero Trust** → **Access** → **Applications** → **Add an application**
   → **Self-hosted**.
2. Domaines protégés : `denistossou.com/admin/messages*` et `denistossou.com/api/messages*`.
3. Politique : **Allow** — **Emails** — ton adresse uniquement.
4. Dans l'application créée, copie l'**Application Audience (AUD) Tag**, et note ton
   domaine d'équipe (ex. `denistossou.cloudflareaccess.com`).
5. Ajoute ces deux variables au Worker (comme à l'étape 1) :
   - `ACCESS_TEAM_DOMAIN` = ton domaine d'équipe
   - `ACCESS_AUD` = l'AUD Tag

Ouvre ensuite `denistossou.com/admin/messages` : Cloudflare te demande un code reçu par
email, puis affiche les messages.
