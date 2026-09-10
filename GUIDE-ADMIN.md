# Guide — Activer le panneau d'administration de ton portfolio

Ce guide t'explique comment activer `tonsite.com/admin`, un tableau de bord où
tu te connectes avec ton compte GitHub pour ajouter, modifier ou retirer des
projets de la page Projets — **sans toucher au code**.

Ça demande environ 20-30 minutes la première fois, à faire une seule fois.
Ensuite, ajouter un projet prend 1 minute.

## Comment ça marche, en une phrase

Le CMS (Decap CMS) écrit directement dans le fichier `data/projects.json` de
ton dépôt GitHub. Cloudflare Pages surveille ce dépôt et republie
automatiquement le site à chaque modification — donc dès que tu cliques
« Publier » dans le panneau d'admin, ton site se met à jour tout seul,
généralement en moins d'une minute.

---

## Étape 1 — Mettre le site sur GitHub (si ce n'est pas déjà fait)

1. Va sur [github.com/new](https://github.com/new), crée un dépôt (par
   exemple `portfolio-denis-tossou`), en **privé ou public**, peu importe.
2. Depuis le dossier de ton site en local, exécute :
   ```bash
   git init
   git add .
   git commit -m "Site initial"
   git branch -M main
   git remote add origin https://github.com/TON_PSEUDO/TON_DEPOT.git
   git push -u origin main
   ```

## Étape 2 — Connecter Cloudflare Pages à ce dépôt

Si ton site est déjà en ligne sur Cloudflare Pages mais publié « à la main »
(glisser-déposer), il faut le rebrancher sur GitHub pour que les
modifications faites depuis `/admin` se publient automatiquement :

1. Dans le Cloudflare Dashboard → **Workers & Pages** → ton projet.
2. Onglet **Settings** → **Builds & deployments** → **Connect to Git** (ou
   crée un nouveau projet Pages si besoin, puis choisis "Connect to Git" dès
   le départ).
3. Choisis ton dépôt GitHub. Build command : laisse vide (site 100%
   statique). Dossier de sortie (« Build output directory ») : `/` (racine).
4. Sauvegarde. Cloudflare republie désormais le site à chaque `git push` —
   et donc à chaque modification faite depuis le panneau d'admin.

## Étape 3 — Créer une GitHub OAuth App

C'est ce qui permet au bouton « Se connecter avec GitHub » de fonctionner.

1. Va sur [github.com/settings/developers](https://github.com/settings/developers)
   → **OAuth Apps** → **New OAuth App**.
2. Remplis :
   - **Application name** : `Portfolio Denis Tossou — Admin`
   - **Homepage URL** : `https://TON-DOMAINE.com`
   - **Authorization callback URL** : `https://TON-WORKER.workers.dev/callback`
     *(tu obtiendras cette URL exacte à l'étape suivante — reviens la
     compléter ensuite si besoin, tu peux la modifier après coup)*
3. Clique **Register application**.
4. Note le **Client ID** affiché.
5. Clique **Generate a new client secret**, note le **Client Secret**
   immédiatement (il ne sera plus jamais affiché en entier après).

## Étape 4 — Déployer le Worker d'authentification

Le fichier `cms-oauth-worker/worker.js` fourni avec ce zip fait le pont
entre GitHub et ton panneau d'admin.

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Create Worker**.
2. Donne-lui un nom, par exemple `decap-oauth`. Note l'URL qu'il te donne :
   `https://decap-oauth.TON-SOUS-DOMAINE.workers.dev`
3. Clique **Edit code**, supprime le code d'exemple, colle le contenu de
   `cms-oauth-worker/worker.js`, clique **Deploy**.
4. Retourne dans les **Settings** du Worker → **Variables and Secrets** →
   ajoute deux variables :
   - `GITHUB_CLIENT_ID` = le Client ID noté à l'étape 3
   - `GITHUB_CLIENT_SECRET` = le Client Secret noté à l'étape 3 (coche
     "Encrypt" si proposé)
5. Redéploie si demandé.
6. Retourne dans ta GitHub OAuth App (étape 3) et vérifie que
   l'**Authorization callback URL** est bien
   `https://decap-oauth.TON-SOUS-DOMAINE.workers.dev/callback` — corrige si besoin.

## Étape 5 — Compléter `admin/config.yml`

Ouvre `admin/config.yml` dans ton dépôt et remplace les 4 valeurs marquées :

```yaml
backend:
  repo: TON_PSEUDO_GITHUB/TON_DEPOT        # ex. denistossou/portfolio-denis-tossou
  base_url: https://decap-oauth.TON-SOUS-DOMAINE.workers.dev

site_url: https://TON-DOMAINE.com
display_url: https://TON-DOMAINE.com
```

Envoie (`git push`) cette modification — Cloudflare republie automatiquement.

## Étape 6 — Se connecter

1. Va sur `https://TON-DOMAINE.com/admin`
2. Clique **Login with GitHub**
3. Autorise l'application la première fois
4. Tu arrives sur le tableau de bord → collection **Projets** → fichier
   **Liste des projets** → tu peux ajouter, modifier, réordonner ou
   supprimer une fiche projet avec un vrai formulaire (titre, catégorie,
   statut, image, résumé, lien, points clés).
5. Collection **Blog** → fichier **Articles du blog** → même principe pour
   ajouter, modifier ou supprimer un article (titre, slug, date, image de
   couverture, résumé, contenu en Markdown).
6. Clique **Publish** en haut à droite pour mettre en ligne.

---

## Ce que tu peux faire depuis le tableau de bord

- Ajouter un nouveau projet (bouton **Add** en bas de la liste)
- Modifier le titre, la catégorie, le statut (Terminé / En cours), le résumé
- Remplacer l'image (upload direct, pas besoin de la renommer ou de la
  redimensionner toi-même au préalable — mais préfère des images pas trop
  lourdes pour que le site reste rapide)
- Ajouter ou retirer le bouton « Voir le projet » (remplis ou vide le champ lien)
- Réordonner les projets par glisser-déposer
- Supprimer un projet (icône corbeille sur sa fiche)

### Côté Blog

- Ajouter un article (bouton **New Blog** en bas de la liste) : titre, slug,
  date, image de couverture, résumé et contenu (Markdown, avec barre d'outils
  pour les titres, le gras, les listes, les liens...)
- Modifier ou supprimer un article existant
- **Important sur le slug** : c'est ce qui compose l'adresse de l'article
  (`article.html?slug=ton-slug`). Choisis-le une fois et évite de le changer
  après publication — sinon les liens déjà partagés (réseaux sociaux, etc.)
  ne fonctionneront plus.
- Le dernier article ajouté s'affiche automatiquement en premier sur
  `blog.html`, pas besoin de le placer manuellement en haut de la liste.

## Limites à connaître

- **Deux types de contenu gérés pour l'instant** : les projets et les
  articles de blog. Le reste du site (textes des autres pages, tarifs, etc.)
  reste à modifier dans le code comme avant. Si tu veux qu'on rende d'autres
  sections éditables de la même façon (témoignages, tarifs...), dis-le-moi.
- **Un compte = un accès total** : n'importe qui connecté avec un compte
  GitHub ayant accès en écriture à ce dépôt peut modifier le contenu. Tant
  que le dépôt reste privé et que tu es seul dessus, aucun souci.
- **Pas de prévisualisation avant publication en un clic** : Decap CMS
  affiche un aperçu dans son interface, mais la vraie mise à jour du site
  prend le temps que Cloudflare republie (généralement moins d'une minute).
