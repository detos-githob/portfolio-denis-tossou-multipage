# Guide — Activer le tableau de bord des messages (remplace Formspree)

Ce guide t'explique comment activer `/admin/messages.html`, un tableau de
bord où tu vois, marques comme lus/traités et supprimes les messages reçus
via le formulaire de contact — sans passer par Formspree ni par ta boîte
mail pour les retrouver.

Ça demande environ 20 minutes la première fois, à faire une seule fois.

## Comment ça marche, en une phrase

Le formulaire envoie les données à une petite fonction (`/api/contact`) qui
tourne automatiquement sur Cloudflare Pages, laquelle enregistre chaque
message dans une base de données **Cloudflare D1** et t'envoie une
notification par email. Le tableau de bord lit cette même base.

**Cette fonctionnalité demande que le site soit hébergé sur Cloudflare
Pages** (voir `README.md`, section Hébergement).

---

## Étape 1 — Créer la base de données D1

1. Cloudflare Dashboard → **Workers & Pages** → **D1 SQL Database** (menu de
   gauche) → **Create database**.
2. Donne-lui un nom, par exemple `portfolio-messages`. Crée-la.
3. Ouvre la base → onglet **Console**.
4. Colle le contenu du fichier `functions/schema.sql` fourni avec ce zip,
   puis exécute. Ça crée la table `messages` — à faire une seule fois.

## Étape 2 — Lier la base à ton projet Cloudflare Pages

1. Cloudflare Dashboard → **Workers & Pages** → ton projet (le site) →
   **Settings** → **Functions**.
2. Section **D1 database bindings** → **Add binding**.
3. **Variable name** : `DB` (exactement ce nom, en majuscules — le code des
   fonctions l'utilise tel quel).
4. **D1 database** : sélectionne `portfolio-messages` créée à l'étape 1.
5. Sauvegarde, puis redéploie le projet si demandé (Settings → Deployments →
   Retry deployment sur le dernier déploiement, ou attends le prochain
   `git push`).

## Étape 3 — Créer un compte Resend (envoi des notifications par email)

Resend a un plan gratuit (3 000 emails/mois) largement suffisant ici.

1. Va sur [resend.com](https://resend.com), crée un compte.
2. **API Keys** → **Create API Key**, note la clé (elle commence par `re_`).
3. Pour commencer sans configuration DNS, tu peux utiliser l'adresse
   d'expédition par défaut `onboarding@resend.dev` — les emails partiront de
   cette adresse mais arriveront bien dans ta boîte. Si tu veux plus tard
   envoyer depuis `@denistossou.com`, il faudra vérifier ton domaine dans
   Resend (Domains → Add Domain) et ajouter les enregistrements DNS demandés
   — pas obligatoire pour démarrer.

## Étape 4 — Ajouter les variables d'environnement

1. Toujours dans **Settings** → **Environment variables** de ton projet Pages
   (Production, et Preview si tu veux tester avant publication).
2. Ajoute :
   - `RESEND_API_KEY` = ta clé Resend de l'étape 3 (coche "Encrypt")
   - `NOTIFY_EMAIL` = l'adresse où tu veux recevoir les notifications, ex.
     `info@denistossou.com`
   - `FROM_EMAIL` *(optionnel)* = `Portfolio <onboarding@resend.dev>`, ou ton
     adresse vérifiée si tu as fait l'étape 3.3
3. Sauvegarde et redéploie si demandé.

## Étape 5 — Déployer le code

Ajoute simplement les fichiers de ce zip à ton dépôt GitHub (mêmes chemins :
`functions/`, `admin/messages.html`, `contact.html` mis à jour) et fais
`git push`. Cloudflare Pages détecte automatiquement le dossier
`functions/` et déploie les routes `/api/contact`, `/api/messages` et
`/api/messages/:id` — aucune configuration supplémentaire nécessaire pour
ça.

## Étape 6 — Protéger le tableau de bord avec Cloudflare Access (gratuit)

Sans cette étape, **n'importe qui connaissant l'URL** pourrait lire tes
messages. Cloudflare Access ajoute une vérification par email, gratuitement,
sans écrire une ligne de code.

1. Cloudflare Dashboard → **Zero Trust** (menu de gauche, ou
   [one.dash.cloudflare.com](https://one.dash.cloudflare.com)). Première
   visite : choisis le plan **Free**.
2. **Access** → **Applications** → **Add an application** → **Self-hosted**.
3. Première application :
   - **Application name** : `Portfolio — Dashboard messages`
   - **Domain** : ton domaine, chemin `/admin/messages*`
   - **Policy** : Action **Allow**, règle **Emails** → ajoute ton adresse
     email (celle avec laquelle tu veux te connecter).
   - Enregistre.
4. Deuxième application, mêmes réglages mais pour l'API :
   - **Application name** : `Portfolio — API messages`
   - **Domain** : ton domaine, chemin `/api/messages*`
   - Même politique (ta même adresse email).
   - Enregistre.
5. **Ne protège pas** `/api/contact` — cette route doit rester accessible à
   tous tes visiteurs, sinon le formulaire de contact ne fonctionnera plus.

## Étape 7 — Se connecter et utiliser le tableau de bord

1. Va sur `https://TON-DOMAINE.com/admin/messages.html`.
2. Cloudflare Access te demande ton email, puis t'envoie un code à 6
   chiffres par email (ou te propose de te connecter via Google/GitHub selon
   ce que tu as configuré) — entre le code.
3. Tu arrives sur le tableau de bord : liste des messages, avec un badge
   Nouveau / Lu / Traité. Clique sur un message pour l'ouvrir, voir le texte
   complet, le marquer lu ou traité, répondre par email en un clic, ou le
   supprimer.
4. Tes onglets **Tous / Nouveaux / Lus / Traités** filtrent la liste.

---

## Ce que tu peux faire depuis le tableau de bord

- Voir tous les messages reçus, classés du plus récent au plus ancien
- Filtrer par statut
- Ouvrir un message pour lire le texte complet, le budget et le délai
  indiqués
- Répondre directement par email (lien `mailto:` pré-rempli)
- Marquer un message comme lu ou traité, ou le remettre en "nouveau"
- Supprimer définitivement un message

## Limites à connaître

- **Ne fonctionne que sur Cloudflare Pages** (Functions + D1). Si tu changes
  d'hébergeur, cette fonctionnalité s'arrête et il faut prévoir une
  alternative (ex. reconnecter Formspree sur `contact.html`).
- **L'email de notification est "best effort"** : si Resend est mal
  configuré ou indisponible, le message reste quand même enregistré et
  visible dans le tableau de bord — tu ne perds jamais un message, tu
  perdrais seulement la notification.
- **Étape 6 (Cloudflare Access) est essentielle** : sans elle, le tableau de
  bord et l'API qui liste les messages sont accessibles à qui connaît
  l'URL. Ne saute pas cette étape.
