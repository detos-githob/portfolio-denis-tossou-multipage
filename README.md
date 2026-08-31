
# Portfolio de Denis Tossou — site multipage

## Structure du projet

```ices, pourquoi me choisir)
a-propos.html      → À propos (qui suis-je, compétences, CV, valeurs, vision)
projets.html       → Projets (grille filtrable, témoignages, partenaires)
services.html      → Services (provisoire — contenu à retravailler ensemble)
contact.html       → Contact (formulaire Formspree actif, FAQ)
css/style.css       → Tout le style, partagé par les 5 pages
js/main.js          → Tout le comportement (carrousel, animations, formulaire...)
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

- Le formulaire de contact est déjà connecté à Formspree
  (`https://formspree.io/f/moearrjp`). Si tu changes d'endpoint,
  remplace-le uniquement dans `contact.html`.
- Un seul lien "Voir le projet" est actif (Edushop → edushop.africa) car
  c'est la seule URL réelle confirmée. Ajoute `<div class="card-cta">...</div>`
  (voir le modèle dans `projets.html`) dès que tu as d'autres URLs.

## Hébergement

Le site est 100% statique (HTML/CSS/JS, aucun serveur requis). Héberge le
dossier complet sur Netlify, Cloudflare Pages ou GitHub Pages — glisse-dépose
le dossier entier (pas juste `index.html`) pour que le CSS, le JS et les
images suivent.

