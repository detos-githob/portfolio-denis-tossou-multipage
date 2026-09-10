# Portfolio de Denis Tossou — site multipage

## Structure du projet

```
index.html        → Accueil (hero carrousel, stats, services, pourquoi me choisir)
a-propos.html      → À propos (qui suis-je, compétences, CV, valeurs, vision)
projets.html       → Projets (grille filtrable, témoignages, partenaires)
blog.html          → Blog (liste des articles, chargée depuis data/blog.json)
article.html       → Article de blog individuel (?slug=...), rendu Markdown
services.html      → Services (provisoire — contenu à retravailler ensemble)
contact.html       → Contact (formulaire branché sur /api/contact, FAQ)
css/style.css       → Tout le style, partagé par toutes les pages
js/main.js          → Tout le comportement (carrousel, animations, formulaire, blog...)
data/blog.json      → Les articles du blog, édités par le CMS (/admin)
assets/img/         → Toutes les images (photos, logos, icônes)
```

## Comment modifier le site

- **Texte** : ouvre le fichier `.html` de la page concernée avec un éditeur de texte
  (VS Code, Notepad++...) et modifie directement le texte entre les balises.
- **Images** : remplace le fichier correspondant dans `assets/img/` en gardant
  exactement le même nom de fichier — pas besoin de toucher au code.
- **Couleurs / mise en page** : tout est dans `css/style.css`, organisé par
  sections numérotées avec des commentaires (`/* === 1. HEADER === */` etc.)
- **Comportements** (carrousel, animations, formulaire) : tout est dans `js/main.js`.

Comme les 3 fichiers `css/style.css` et `js/main.js` sont **partagés** par toutes
les pages, une modification de style ou de comportement se répercute
automatiquement partout — pas besoin de la refaire 5 fois.

## Pages encore provisoires

`services.html` et `contact.html` reprennent le contenu déjà validé en une
seule page, en attendant tes précisions sur ce que tu veux y voir. Aucune
information n'y est inventée — elles sont juste séparées physiquement.

## Statuts des projets

Toutes les fiches de `projets.html` sont marquées **Terminé** d'après les
dates figurant dans le CV. Si certains projets sont en réalité toujours actifs
(ex. gestion continue d'une page Facebook), remplace `status-badge done` par
`status-badge progress` et le texte `Terminé` par `En cours` sur la fiche
concernée.

## Avant mise en ligne

- Le formulaire de contact envoie ses données à `/api/contact` (voir
  `GUIDE-MESSAGES.md` pour l'activer) — les messages sont enregistrés dans
  une base D1 et consultables depuis `/admin/messages.html`.
- Un seul lien "Voir le projet" est actif (Edushop → edushop.africa) car
  c'est la seule URL réelle confirmée. Ajoute `<div class="card-cta">...</div>`
  (voir le modèle dans `projets.html`) dès que tu as d'autres URLs.

## Hébergement

Les pages du site (HTML/CSS/JS/images) sont 100% statiques et peuvent être
hébergées n'importe où (Netlify, Cloudflare Pages, GitHub Pages...).

**Exception : le formulaire de contact** (`contact.html` → `/api/contact`)
et le tableau de bord des messages (`/admin/messages.html`) reposent sur les
**Cloudflare Pages Functions** et une base **Cloudflare D1** (voir
`GUIDE-MESSAGES.md`) — ces deux fonctionnalités ne marchent que si le site
est hébergé sur **Cloudflare Pages**. Si un jour tu changes d'hébergeur pour
le reste du site, il faudra rebrancher le formulaire sur un autre service
(ex. reconnecter Formspree).

## Panneau d'administration (ajouter des projets sans coder)

Un panneau `/admin` (Decap CMS) est en place pour gérer la page Projets
directement depuis un navigateur, sans toucher au code. Il n'est **pas encore
actif** — il demande une configuration ponctuelle (compte GitHub, Cloudflare
Worker). Suis **`GUIDE-ADMIN.md`** pour l'activer, étape par étape (~20-30 min,
une seule fois).

Fichiers concernés :
- `admin/index.html` et `admin/config.yml` — l'interface d'administration
- `data/projects.json` et `data/blog.json` — les données éditées par le CMS
- `cms-oauth-worker/worker.js` — le code à déployer sur Cloudflare Workers
  pour gérer la connexion GitHub (pas un fichier du site, à déployer à part)

## Messages du formulaire de contact (sans Formspree)

Le formulaire de contact enregistre désormais les messages directement dans
une base Cloudflare D1, consultables depuis `/admin/messages.html` (marquer
lu/traité, répondre, supprimer). Suis **`GUIDE-MESSAGES.md`** pour
l'activer — nécessite Cloudflare Pages (voir « Hébergement » ci-dessus).
