/* ========================= HEADER — scroll + menu mobile ========================= */
const header = document.getElementById('siteHeader');
if (header) {
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 10);
  }, {passive:true});
  const burger = document.getElementById('burgerBtn');
  if (burger) {
    burger.addEventListener('click', () => {
      const open = header.classList.toggle('nav-open');
      burger.setAttribute('aria-expanded', open);
    });
    document.querySelectorAll('.mobile-nav a').forEach(a=>{
      a.addEventListener('click', ()=> header.classList.remove('nav-open'));
    });
  }
}

/* ========================= SCROLL REVEAL ========================= */
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let sharedRevealIO = null;
function applyReveal(scope){
  const els = (scope || document).querySelectorAll('.reveal');
  if (!els.length) return;
  if ('IntersectionObserver' in window && !reduceMotion) {
    if (!sharedRevealIO) {
      sharedRevealIO = new IntersectionObserver((entries)=>{
        entries.forEach(e=>{
          if (e.isIntersecting) { e.target.classList.add('in'); sharedRevealIO.unobserve(e.target); }
        });
      }, {threshold:0.15});
    }
    els.forEach(el=>sharedRevealIO.observe(el));
  } else {
    els.forEach(el=>el.classList.add('in'));
  }
}
applyReveal(document);

/* ========================= TYPEWRITER — rôle dans le hero ========================= */
const roles = ["Développeur web","Designer UI/UX","Gestionnaire de campagnes digitales","Référent digital"];
const typedEl = document.getElementById('typedRole');
if (typedEl && !reduceMotion) {
  let ri=0, ci=0, deleting=false;
  function tickRole(){
    const word = roles[ri];
    if(!deleting){
      ci++;
      typedEl.textContent = word.slice(0,ci);
      if(ci===word.length){deleting=true; setTimeout(tickRole,1600); return;}
    } else {
      ci--;
      typedEl.textContent = word.slice(0,ci);
      if(ci===0){deleting=false; ri=(ri+1)%roles.length;}
    }
    setTimeout(tickRole, deleting?35:70);
  }
  setTimeout(tickRole, 1500);
}

/* ========================= HERO CAROUSEL (4 slides, 4e = code) ========================= */
const heroSlides = document.querySelectorAll('.hero-slide');
const heroDots = document.querySelectorAll('.hero-dots button');
if (heroSlides.length) {
  let activeHero = 0;
  let heroTimer = null;

  function goToHeroSlide(i){
    heroSlides[activeHero].classList.remove('active');
    heroDots[activeHero] && heroDots[activeHero].classList.remove('active');
    activeHero = i;
    heroSlides[activeHero].classList.add('active');
    heroDots[activeHero] && heroDots[activeHero].classList.add('active');
    if (activeHero === heroSlides.length - 1) startCodeTyping();
  }
  function nextHeroSlide(){ goToHeroSlide((activeHero + 1) % heroSlides.length); }
  function startHeroTimer(){
    if (reduceMotion) return;
    clearInterval(heroTimer);
    heroTimer = setInterval(nextHeroSlide, 4500);
  }
  heroDots.forEach((d,i)=> d.addEventListener('click', ()=>{ goToHeroSlide(i); startHeroTimer(); }));
  const heroBlob = document.querySelector('.hero-blob');
  if (heroBlob) {
    heroBlob.addEventListener('mouseenter', ()=> clearInterval(heroTimer));
    heroBlob.addEventListener('mouseleave', ()=> startHeroTimer());
  }
  startHeroTimer();

  const codeLines = [
    [{t:'tok-com', v:'// portfolio de Denis Tossou'}],
    [{t:'tok-key', v:'const '}, {t:'', v:'skills = ['}, {t:'tok-str', v:"'dev'"}, {t:'', v:', '}, {t:'tok-str', v:"'design'"}, {t:'', v:', '}, {t:'tok-str', v:"'ads'"}, {t:'', v:'];'}],
    [{t:'tok-key', v:'function '}, {t:'tok-fn', v:'buildProject'}, {t:'', v:'(idée) {'}],
    [{t:'', v:'  return idée'}],
    [{t:'', v:'    .'}, {t:'tok-fn', v:'design'}, {t:'', v:'()'}],
    [{t:'', v:'    .'}, {t:'tok-fn', v:'develop'}, {t:'', v:'()'}],
    [{t:'', v:'    .'}, {t:'tok-fn', v:'promote'}, {t:'', v:'();'}],
    [{t:'', v:'}'}],
    [{t:'tok-tag', v:'<'}, {t:'tok-key', v:'site'}, {t:'tok-tag', v:' status='}, {t:'tok-str', v:'"en ligne"'}, {t:'tok-tag', v:' />'}],
  ];
  const codeBody = document.getElementById('codeBody');
  let codeTypingStarted = false;

  function startCodeTyping(){
    if (!codeBody || codeTypingStarted || reduceMotion) return;
    codeTypingStarted = true;
    codeBody.innerHTML = '';
    let lineIndex = 0;
    function typeLine(){
      if (lineIndex >= codeLines.length) return;
      const lineDiv = document.createElement('div');
      lineDiv.className = 'code-line';
      codeBody.appendChild(lineDiv);
      const tokens = codeLines[lineIndex];
      let tokenIndex = 0, charIndex = 0;
      function typeChar(){
        if (tokenIndex >= tokens.length) {
          lineIndex++;
          setTimeout(typeLine, 160);
          return;
        }
        const token = tokens[tokenIndex];
        let span = lineDiv.lastChild;
        if (!span || span.dataset.tok !== String(tokenIndex)) {
          span = document.createElement('span');
          span.className = token.t;
          span.dataset.tok = String(tokenIndex);
          lineDiv.appendChild(span);
        }
        charIndex++;
        span.textContent = token.v.slice(0, charIndex);
        if (charIndex >= token.v.length) { tokenIndex++; charIndex = 0; }
        setTimeout(typeChar, 14);
      }
      typeChar();
    }
    typeLine();
  }
  if (heroSlides[3] && heroSlides[3].classList.contains('active')) startCodeTyping();
}

/* ========================= COMPTEURS ANIMÉS (stats) ========================= */
const counters = document.querySelectorAll('.num[data-count]');
if (counters.length) {
  const countIO = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        const el = e.target;
        const target = parseInt(el.dataset.count,10);
        const suffix = el.dataset.suffix || '';
        let cur = 0;
        const step = Math.max(1, Math.round(target/40));
        const run = ()=>{
          cur += step;
          if(cur>=target){ el.textContent = target+suffix; return; }
          el.textContent = cur+suffix;
          requestAnimationFrame(()=>setTimeout(run,20));
        };
        run();
        countIO.unobserve(el);
      }
    });
  }, {threshold:0.5});
  counters.forEach(c=>countIO.observe(c));
}

/* ========================= SKILL PILLS (count-up %) ========================= */
const skillPills = document.querySelectorAll('.skill-pill');
if (skillPills.length) {
  const pillIO = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        const pill = e.target;
        const pct = parseInt(pill.dataset.pct,10);
        const pctLabel = pill.querySelector('.pct');
        let cur=0;
        const step = Math.max(1, Math.round(pct/30));
        const run=()=>{
          cur+=step;
          if(cur>=pct){ pctLabel.textContent = pct+'%'; return; }
          pctLabel.textContent = cur+'%';
          requestAnimationFrame(()=>setTimeout(run,25));
        };
        run();
        pillIO.unobserve(pill);
      }
    });
  }, {threshold:0.4});
  skillPills.forEach(p=>pillIO.observe(p));
}

/* ========================= PROJETS — chargement depuis data/projects.json ========================= */
const portfolioGrid = document.getElementById('portfolioGrid');
const filterBtns = document.querySelectorAll('#filterTabs .btn-plain');

function escapeHTML(str){
  return String(str == null ? '' : str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

const categoryLabels = { developpement: 'Développement', design: 'Design', marketing: 'Marketing digital' };

function projectCardHTML(p, i){
  const thumbClass = p.imageStyle === 'contain' ? 'thumb logo-thumb' : 'thumb';
  const statusClass = p.status === 'encours' ? 'progress' : 'done';
  const statusLabel = p.status === 'encours' ? 'En cours' : 'Terminé';
  const catLabel = categoryLabels[p.category] || p.category;
  const delayClass = ['','reveal-delay-1','reveal-delay-2'][i % 3];

  const featuresHTML = (p.features && p.features.length)
    ? `<ul class="did-list">${p.features.map(f => `<li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M4 12l5 5L20 6"/></svg>${escapeHTML(f)}</li>`).join('')}</ul>`
    : '';

  const ctaHTML = p.link
    ? `<div class="card-cta"><a href="${escapeHTML(p.link)}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm"><span class="btn-label">Voir le projet</span><span class="btn-arrow"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M7 17 17 7M9 7h8v8"/></svg></span></a></div>`
    : '';

  return `
    <div class="p-card reveal ${delayClass}" data-category="${escapeHTML(p.category)}">
      <div class="${thumbClass}">
        <img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.title)}" loading="lazy" decoding="async">
        <span class="status-badge ${statusClass}">${statusLabel}</span>
        ${p.badge ? `<span class="thumb-badge">${escapeHTML(p.badge)}</span>` : ''}
      </div>
      <div class="body">
        <div class="tag-row"><span class="tag tag-orange">${escapeHTML(catLabel)}</span></div>
        <h4>${escapeHTML(p.title)}</h4>
        <p class="summary">${escapeHTML(p.summary)}</p>
        ${featuresHTML}
        ${ctaHTML}
      </div>
    </div>`;
}

async function loadProjects(){
  if (!portfolioGrid) return;
  const source = portfolioGrid.dataset.source;
  try {
    const res = await fetch(source);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const items = data.items || [];
    portfolioGrid.innerHTML = items.map((p,i)=>projectCardHTML(p,i)).join('');
    applyReveal(portfolioGrid);
  } catch (err) {
    portfolioGrid.innerHTML = '<p style="text-align:center;color:var(--muted);grid-column:1/-1;">Impossible de charger les projets pour le moment.</p>';
    console.error('Erreur de chargement des projets :', err);
  }
}
loadProjects();

if (filterBtns.length) {
  filterBtns.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      filterBtns.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      document.querySelectorAll('#portfolioGrid .p-card').forEach(card=>{
        const cats = (card.dataset.category || '').split(' ').filter(Boolean);
        const show = filter === 'tous' || cats.includes(filter);
        card.classList.toggle('is-hidden', !show);
      });
    });
  });
}

/* ========================= TEMOIGNAGES — carrousel ========================= */
const testiSlides = document.querySelectorAll('.testi-slide');
const testiDots = document.querySelectorAll('.testi-dots .d');
if (testiSlides.length) {
  let activeSlide = 0;
  function goToSlide(i){
    testiSlides[activeSlide].classList.remove('active');
    testiDots[activeSlide].classList.remove('active');
    activeSlide = i;
    testiSlides[activeSlide].classList.add('active');
    testiDots[activeSlide].classList.add('active');
  }
  testiDots.forEach((d,i)=> d.addEventListener('click', ()=>goToSlide(i)));
  let testiTimer = setInterval(()=>{ goToSlide((activeSlide+1)%testiSlides.length); }, 6000);
  const testiSection = document.querySelector('.testimonials');
  if (testiSection) testiSection.addEventListener('mouseenter', ()=>clearInterval(testiTimer));
}

/* ========================= FAQ — accordéon ========================= */
document.querySelectorAll('.faq-item').forEach(item=>{
  const q = item.querySelector('.faq-q');
  const a = item.querySelector('.faq-a');
  q.addEventListener('click', ()=>{
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i=>{
      i.classList.remove('open');
      i.querySelector('.faq-a').style.maxHeight = null;
    });
    if(!isOpen){
      item.classList.add('open');
      a.style.maxHeight = a.scrollHeight + 'px';
    }
  });
});

/* ========================= FORMULAIRE DE CONTACT — Formspree ========================= */
const form = document.getElementById('contactForm');
if (form) {
  /* Pré-remplissage depuis l'URL (ex. contact.html?service=developpement&budget=starter) */
  const params = new URLSearchParams(window.location.search);
  const serviceField = document.getElementById('f-service');
  const budgetField = document.getElementById('f-budget');
  if (serviceField && params.has('service')) {
    const val = params.get('service');
    if ([...serviceField.options].some(o => o.value === val)) serviceField.value = val;
  }
  if (budgetField && params.has('budget')) {
    const val = params.get('budget');
    if ([...budgetField.options].some(o => o.value === val)) budgetField.value = val;
  }

  const formNote = document.getElementById('formNote');
  const submitLabel = document.getElementById('submitLabel');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailField = form.querySelector('input[name="email"]');
    const messageField = form.querySelector('textarea[name="message"]');
    if (!emailField.value || !messageField.value) {
      formNote.textContent = "Merci de renseigner au moins ton email et ton message.";
      formNote.style.color = '#c0392b';
      return;
    }
    submitLabel.textContent = "Envoi...";
    formNote.textContent = "";
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      });
      if (response.ok) {
        formNote.textContent = "Message envoyé. Je vous réponds sous 24h.";
        formNote.style.color = 'var(--orange-dark)';
        form.reset();
      } else {
        formNote.textContent = "L'envoi a échoué — réessaie, ou écris-moi directement sur WhatsApp.";
        formNote.style.color = '#c0392b';
      }
    } catch (err) {
      formNote.textContent = "Connexion impossible — réessaie, ou écris-moi directement sur WhatsApp.";
      formNote.style.color = '#c0392b';
    } finally {
      submitLabel.textContent = "Envoyer";
    }
  });
}

/* ========================= BOUTON WHATSAPP FLOTTANT ========================= */
const waFloat = document.getElementById('waFloat');
if (waFloat) {
  window.addEventListener('scroll', () => {
    waFloat.classList.toggle('is-visible', window.scrollY > 300);
  }, {passive:true});
}
