/**
 * Build du portfolio — exécuté par Cloudflare avant chaque mise en ligne
 * (commande de build : `node scripts/build.mjs`). Aucune dépendance npm.
 *
 * À partir des fichiers gérés par le CMS (data/blog.json, data/projects.json), il génère :
 *   1. une vraie page HTML par article : /blog/<slug>/index.html
 *      (titre, description, image de partage, données structurées, contenu complet)
 *   2. les cartes d'articles, écrites directement dans /blog/index.html
 *   3. les cartes de projets, écrites directement dans /projets.html
 *   4. le sitemap.xml
 *
 * Résultat : Google lit tout le contenu sans avoir à exécuter de JavaScript.
 * Le script peut être relancé autant de fois que nécessaire (il remplace ce qu'il a généré).
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync, openSync, readSync, closeSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from './vendor/marked.esm.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://denistossou.com';
const AUTHOR_ID = `${SITE}/#person`;
const DEFAULT_OG = '/assets/img/og-image.jpg';
const GENERATOR_MARK = '<meta name="generator" content="scripts/build.mjs">';

const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const write = (p, content) => {
  mkdirSync(dirname(join(ROOT, p)), { recursive: true });
  writeFileSync(join(ROOT, p), content);
};

/* ------------------------------------------------------------------ utilitaires */

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Même logique que slugify() dans js/main.js — les deux doivent rester identiques. */
export function slugify(s) {
  return String(s ?? '')
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .replace(/^blog\//i, '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
function formatFRDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : (iso || '');
}

const absUrl = (p) => (/^https?:\/\//.test(p) ? p : SITE + (p.startsWith('/') ? p : '/' + p));
const sitePath = (p) => (/^https?:\/\//.test(p || '') ? p : '/' + String(p || '').replace(/^\/+/, ''));

/** Lit largeur/hauteur d'une image PNG, JPEG ou WebP locale (sans bibliothèque). */
function imageSize(publicPath) {
  if (!publicPath || /^https?:/.test(publicPath)) return null;
  const file = join(ROOT, decodeURI(publicPath.replace(/^\/+/, '')));
  if (!existsSync(file)) return null;
  const buf = Buffer.alloc(65536);
  const fd = openSync(file, 'r');
  const n = readSync(fd, buf, 0, buf.length, 0);
  closeSync(fd);
  const b = buf.subarray(0, n);
  if (b.readUInt32BE(0) === 0x89504e47) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = b.toString('ascii', 12, 16);
    if (chunk === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
    if (chunk === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
    if (chunk === 'VP8L') { const v = b.readUInt32LE(21); return { w: (v & 0x3fff) + 1, h: ((v >> 14) & 0x3fff) + 1 }; }
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length - 9) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
      }
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return null;
}
const dimAttrs = (src) => { const d = imageSize(src); return d ? ` width="${d.w}" height="${d.h}"` : ''; };

/** Contenu Markdown -> HTML. Le titre est déjà le <h1> de la page : on retire le « # Titre »
 *  placé en tête du texte et on transforme les autres « # » en sous-titres (h2). */
function renderBody(md) {
  const cleaned = String(md || '')
    .replace(/^\s*#\s+[^\n]*\n+/, '')
    .replace(/^#\s+/gm, '## ');
  let html = marked.parse(cleaned);
  // Liens externes : nouvel onglet, sans transmettre l'accès à la page
  html = html.replace(/<a href="(https?:\/\/(?!denistossou\.com)[^"]+)"/g, '<a href="$1" target="_blank" rel="noopener"');
  // Images insérées dans le texte : chargement différé
  html = html.replace(/<img (?![^>]*loading=)/g, '<img loading="lazy" decoding="async" ');
  return html;
}

const wordCount = (md) => String(md || '').replace(/[#>*_`\[\]()!-]/g, ' ').split(/\s+/).filter(Boolean).length;

function replaceBetween(html, name, content, file) {
  const re = new RegExp(`(<!-- build:${name} -->)[\\s\\S]*?(<!-- /build:${name} -->)`);
  if (!re.test(html)) throw new Error(`Marqueurs <!-- build:${name} --> introuvables dans ${file}`);
  return html.replace(re, `$1\n${content}\n      $2`);
}

const jsonLd = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

/* ------------------------------------------------------------------ données */

const blogData = JSON.parse(read('data/blog.json'));
const projectData = JSON.parse(read('data/projects.json'));

const articles = (blogData.items || [])
  .map((a, i) => ({ ...a, slug: slugify(a.slug || a.title), _order: i }))
  .filter((a) => a.slug && a.title)
  // Les plus récents en premier (à date égale : le dernier ajouté dans le CMS d'abord)
  .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || b._order - a._order);

const seen = new Set();
for (const a of articles) {
  if (seen.has(a.slug)) throw new Error(`Deux articles ont le même slug « ${a.slug} ». Corrige-le dans /admin.`);
  seen.add(a.slug);
}

// Comme sur le site : les derniers projets ajoutés dans le CMS s'affichent en premier
const projects = [...(projectData.items || [])].reverse();

/* ------------------------------------------------------------------ gabarits partagés */

const blogIndexFile = 'blog/index.html';
let blogIndex = read(blogIndexFile);
const HEADER = blogIndex.slice(blogIndex.indexOf('<header'), blogIndex.indexOf('</header>') + '</header>'.length);
const AFTER_MAIN = blogIndex.slice(blogIndex.indexOf('<section class="cta-banner'), blogIndex.indexOf('<script src="/js/main.js"'));
if (!HEADER.startsWith('<header') || !AFTER_MAIN.startsWith('<section')) throw new Error('Impossible de lire l’en-tête ou le pied de page dans blog/index.html');

const ARROW = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M7 17 17 7M9 7h8v8"/></svg>';
const CHECK = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M4 12l5 5L20 6"/></svg>';

/** Carte d'article — même balisage que blogCardHTML() dans js/main.js */
function blogCard(a, i, headingTag = 'h2') {
  const delay = ['', 'reveal-delay-1', 'reveal-delay-2'][i % 3];
  const cover = sitePath(a.cover);
  return `        <a href="/blog/${a.slug}/" class="blog-card reveal ${delay}" data-slug="${esc(a.slug)}">
          <div class="thumb">
            <img src="${esc(cover)}" alt="${esc(a.title)}"${dimAttrs(cover)} loading="lazy" decoding="async">
          </div>
          <div class="body">
            <time class="blog-date" datetime="${esc(a.date)}">${esc(formatFRDate(a.date))}</time>
            <${headingTag} class="blog-card-title">${esc(a.title)}</${headingTag}>
            <p class="summary">${esc(a.excerpt)}</p>
            <span class="blog-readmore">Lire l'article
              ${ARROW}
            </span>
          </div>
        </a>`;
}

const CATEGORY_LABELS = { developpement: 'Développement', design: 'Design', marketing: 'Marketing digital' };

/** Carte de projet — même balisage que projectCardHTML() dans js/main.js */
function projectCard(p, i) {
  const delay = ['', 'reveal-delay-1', 'reveal-delay-2'][i % 3];
  const thumbClass = p.imageStyle === 'contain' ? 'thumb logo-thumb' : 'thumb';
  const inProgress = p.status === 'encours';
  const img = sitePath(p.image);
  const features = (p.features && p.features.length)
    ? `\n          <ul class="did-list">${p.features.map((f) => `<li>${CHECK}${esc(f)}</li>`).join('')}</ul>`
    : '';
  const cta = p.link
    ? `\n          <div class="card-cta"><a href="${esc(p.link)}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm"><span class="btn-label">Voir le projet</span><span class="btn-arrow">${ARROW}</span></a></div>`
    : '';
  return `        <div class="p-card reveal ${delay}" data-category="${esc(p.category)}">
          <div class="${thumbClass}">
            <img src="${esc(img)}" alt="${esc(p.title)}"${dimAttrs(img)} loading="lazy" decoding="async">
            <span class="status-badge ${inProgress ? 'progress' : 'done'}">${inProgress ? 'En cours' : 'Terminé'}</span>${p.badge ? `\n            <span class="thumb-badge">${esc(p.badge)}</span>` : ''}
          </div>
          <div class="body">
            <div class="tag-row"><span class="tag tag-orange">${esc(CATEGORY_LABELS[p.category] || p.category)}</span></div>
            <h2 class="p-card-title">${esc(p.title)}</h2>
            <p class="summary">${esc(p.summary)}</p>${features}${cta}
          </div>
        </div>`;
}

/* ------------------------------------------------------------------ 1. pages d'articles */

const BREADCRUMB = (items) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: absUrl(url) })),
});

function articlePage(a) {
  const url = `${SITE}/blog/${a.slug}/`;
  const title = (a.seoTitle || '').trim() || a.title;
  // On ajoute « | Denis Tossou » seulement si le titre reste lisible en entier dans Google (~65 caractères)
  const fullTitle = title.length <= 50 ? `${title} | Denis Tossou` : title;
  const description = (a.excerpt || '').trim();
  const cover = a.cover ? sitePath(a.cover) : DEFAULT_OG;
  const coverSize = imageSize(cover);
  const words = wordCount(a.body);
  const minutes = Math.max(1, Math.round(words / 220));
  const modified = (a.updated || a.date || '').slice(0, 10);
  const others = articles.filter((o) => o.slug !== a.slug).slice(0, 3);

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        '@id': `${url}#article`,
        headline: a.title,
        description,
        image: [absUrl(cover)],
        datePublished: a.date,
        dateModified: modified,
        inLanguage: 'fr-FR',
        wordCount: words,
        mainEntityOfPage: url,
        author: { '@type': 'Person', '@id': AUTHOR_ID, name: 'Denis Tossou', url: `${SITE}/a-propos` },
        publisher: { '@id': AUTHOR_ID },
        isPartOf: { '@type': 'Blog', '@id': `${SITE}/blog/#blog`, name: 'Blog de Denis Tossou', url: `${SITE}/blog/` },
      },
      BREADCRUMB([['Accueil', '/'], ['Blog', '/blog/'], [a.title, `/blog/${a.slug}/`]]),
    ],
  };

  const related = others.length ? `
<section class="blog-list related-posts">
  <div class="container">
    <div class="section-head"><span class="eyebrow">À lire aussi</span></div>
    <div class="blog-grid">
${others.map((o, i) => blogCard(o, i, 'h3')).join('\n')}
    </div>
  </div>
</section>
` : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${GENERATOR_MARK}
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<meta name="author" content="Denis Tossou">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#ffffff">
<link rel="icon" href="/assets/img/favicon.png" type="image/png">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
<meta property="og:locale" content="fr_FR">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Denis Tossou">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${esc(absUrl(cover))}">${coverSize ? `
<meta property="og:image:width" content="${coverSize.w}">
<meta property="og:image:height" content="${coverSize.h}">` : ''}
<meta property="og:image:alt" content="${esc(a.title)}">
<meta property="article:published_time" content="${esc(a.date)}">
<meta property="article:modified_time" content="${esc(modified)}">
<meta property="article:author" content="${SITE}/a-propos">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(absUrl(cover))}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,600;0,700;0,800;1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/style.css">
<link rel="preload" as="image" href="${esc(cover)}" fetchpriority="high">
${jsonLd(ld)}
</head>
<body>

${HEADER}

<main>
<article class="article-page">
  <div class="container">
    <a href="/blog/" class="article-back">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M17 7 7 17M7 7v10h10"/></svg>
      Retour au blog
    </a>
    <div class="article-head">
      <span class="blog-date"><time datetime="${esc(a.date)}">${esc(formatFRDate(a.date))}</time> · ${minutes} min de lecture</span>
      <h1>${esc(a.title)}</h1>
    </div>
    <div class="article-cover"><img src="${esc(cover)}" alt="${esc(a.title)}"${coverSize ? ` width="${coverSize.w}" height="${coverSize.h}"` : ''} fetchpriority="high" decoding="async"></div>
    <div class="article-body">
${renderBody(a.body)}
    </div>
  </div>
</article>
${related}</main>

${AFTER_MAIN}<script src="/js/main.js"></script>
</body>
</html>
`;
}

// Supprime les pages d'articles générées qui n'existent plus dans le CMS
const blogDir = join(ROOT, 'blog');
for (const entry of readdirSync(blogDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const index = join(blogDir, entry.name, 'index.html');
  const generated = existsSync(index) && readFileSync(index, 'utf8').includes(GENERATOR_MARK);
  if (generated && !seen.has(entry.name)) {
    rmSync(join(blogDir, entry.name), { recursive: true, force: true });
    console.log(`- article retiré : /blog/${entry.name}/`);
  }
}
for (const a of articles) {
  write(`blog/${a.slug}/index.html`, articlePage(a));
  console.log(`✓ /blog/${a.slug}/`);
}

/* ------------------------------------------------------------------ 2. & 3. cartes statiques */

blogIndex = replaceBetween(
  blogIndex, 'blog-cards',
  articles.length
    ? articles.map((a, i) => blogCard(a, i)).join('\n')
    : '        <p style="text-align:center;color:var(--muted);grid-column:1/-1;">Aucun article publié pour le moment.</p>',
  blogIndexFile,
);
write(blogIndexFile, blogIndex);
console.log(`✓ /blog/ : ${articles.length} carte(s) d'article`);

const projetsFile = 'projets.html';
write(projetsFile, replaceBetween(read(projetsFile), 'project-cards', projects.map(projectCard).join('\n'), projetsFile));
console.log(`✓ /projets : ${projects.length} carte(s) de projet`);

/* ------------------------------------------------------------------ 4. sitemap.xml */

const latest = articles[0]?.date;
const pages = [
  ['/', null], ['/a-propos', null], ['/services', null], ['/projets', null],
  ['/blog/', latest], ['/contact', null],
  ...articles.map((a) => [`/blog/${a.slug}/`, (a.updated || a.date || '').slice(0, 10)]),
];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(([p, d]) => `  <url><loc>${SITE}${p}</loc>${d ? `<lastmod>${d}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`);
console.log(`✓ sitemap.xml : ${pages.length} URL`);
