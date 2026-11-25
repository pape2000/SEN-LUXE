/* SEN LUXE v6.2 — « Motion Script » : animations écrites en code, exécutées par le moteur (partagé gestionnaire / site public).
 * SÉCURITÉ : le code d'animation est du JSON (commentaires autorisés), jamais du JavaScript. Il est validé champ par champ
 * (liste blanche stricte : propriétés, valeurs, sélecteurs) puis COMPILÉ en images-clés Web Animations. Aucun eval, aucune
 * fonction, aucune URL, aucun HTML. Les sélecteurs libres sont limités à classes/identifiants/balises du site.
 * Désactivation : toutes les animations sont annulées (cancel) → le site retrouve exactement son rendu d'origine. */
(function(root){
  'use strict';
  const RM = () => { try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } };
  const COARSE = () => { try{ return matchMedia('(pointer:coarse)').matches || innerWidth < 700; }catch(e){ return false; } };
  const EASES = { smooth: 'cubic-bezier(.22,.8,.2,1)', spring: 'cubic-bezier(.34,1.56,.64,1)', snap: 'cubic-bezier(.7,0,.2,1)', soft: 'cubic-bezier(.4,0,.2,1)', linear: 'linear', 'ease-out': 'ease-out', 'ease-in-out': 'ease-in-out' };
  const TRIGGERS = ['load', 'enter', 'hover', 'click', 'scroll'];
  const ZONES = {
    public: {
      logo: ['.logo', 'Logo et identité'], header: ['#siteHeader', 'En-tête'], nav: ['#siteHeader .nav-link', 'Navigation'],
      menus: ['.nav-dropdown-menu, .cat-strip .cat-pill, .mobile-nav-static', 'Menus et sous-menus'], hero: ['.hero-inner > *', 'Textes de la bannière'],
      banners: ['.hero-media', 'Bannière et fond d\'accueil'], sections: ['section', 'Sections'], backgrounds: ['.story, .newsletter, .collections, .trust', 'Arrière-plans de sections'],
      images: ['.product-media img, .coll-card img, .editorial-card img, .story-media img, .slx-img', 'Images et visuels produit'], cards: ['.product-card, .coll-card, .editorial-card', 'Cartes'],
      prices: ['.product-price', 'Prix'], badges: ['.badge', 'Badges'], buttons: ['.btn-primary, .btn-secondary, .quick-add, .checkout-btn', 'Boutons'],
      cart: ['.cart-drawer, .cart-item', 'Panier'], cartcount: ['#cartCount', 'Compteur du panier'], modal: ['.qv-modal', 'Fiche produit rapide'], footer: ['footer .footer-top > *, footer .footer-bottom', 'Pied de page']
    },
    manager: {
      logo: ['.sidebar .logo-word', 'Logo (menu)'], nav: ['.nav button', 'Menu latéral'], cards: ['#view .mcard, #view .ccard, #view .an-card, #view .stat', 'Cartes'], buttons: ['.btn', 'Boutons'],
      toasts: ['.toast', 'Notifications'], panels: ['#view .panel', 'Panneaux'], topbar: ['.topbar', 'Barre du haut']
    }
  };
  const SEL_RE = /^(?:[.#]?[a-zA-Z][\w-]{0,40}(?::(?:hover|first-child|last-child|nth-child\(\d{1,2}\)))?)(?:\s*>?\s*[.#]?[a-zA-Z][\w-]{0,40}(?::(?:hover|first-child|last-child|nth-child\(\d{1,2}\)))?){0,3}$/;
  const PROPS = { opacity: [0, 1], x: [-600, 600], y: [-600, 600], scale: [0, 3], scaleX: [0, 3], scaleY: [0, 3], rotate: [-720, 720], skewX: [-60, 60], skewY: [-60, 60], blur: [0, 30], brightness: [0, 3], saturate: [0, 3] };
  const CLIP_RE = /^(inset\(\s*-?\d{1,3}(\.\d+)?%(\s+-?\d{1,3}(\.\d+)?%){0,3}\s*\)|circle\(\s*\d{1,3}(\.\d+)?%(\s+at\s+\d{1,3}(\.\d+)?%\s+\d{1,3}(\.\d+)?%)?\s*\))$/;
  const ORIGINS = ['center', 'top', 'bottom', 'left', 'right', 'top left', 'top right', 'bottom left', 'bottom right'];
  const TOP = ['name', 'desc', 'target', 'selector', 'trigger', 'duration', 'delay', 'stagger', 'ease', 'iterations', 'direction', 'intensity', 'origin', 'from', 'to', 'keyframes', 'color', 'variant', 'limit'];
  const num = (v, a, b) => typeof v === 'number' && isFinite(v) && v >= a && v <= b;

  function stripComments(s){ return String(s).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:"'\\])\/\/[^\n]*/g, '$1'); }
  function parse(text){ try{ const t = stripComments(text).replace(/([:\[,]\s*)(-?)\.(\d)/g, '$1$20.$3').replace(/,(\s*[}\]])/g, '$1'); return { ok: true, v: JSON.parse(t) }; }catch(e){ return { ok: false, err: String(e.message || e).replace(/^JSON\.parse: /, '').slice(0, 160) }; } }

  function frame(f, where, errs){
    const o = {}; if(f === undefined || f === null) return o; if(typeof f !== 'object' || Array.isArray(f)){ errs.push(where + ' : objet attendu.'); return o; }
    Object.keys(f).forEach(k => {
      const v = f[k];
      if(k === 'offset'){ if(!num(v, 0, 1)) errs.push(where + ' : offset entre 0 et 1.'); else o.offset = v; return; }
      if(k === 'clip'){ if(typeof v !== 'string' || !CLIP_RE.test(v.trim())) errs.push(where + ' : « clip » accepte seulement inset(…%) ou circle(…%).'); else o.clip = v.trim().replace(/\s+/g, ' '); return; }
      if(!PROPS[k]){ errs.push(where + ' : propriété « ' + String(k).slice(0, 24) + ' » non autorisée (permises : ' + Object.keys(PROPS).concat('clip').join(', ') + ').'); return; }
      if(!num(v, PROPS[k][0], PROPS[k][1])) errs.push(where + ' : « ' + k + ' » doit être un nombre entre ' + PROPS[k][0] + ' et ' + PROPS[k][1] + '.'); else o[k] = v;
    });
    return o;
  }
  /* Retourne { ok, errors, spec } — spec = version assainie reconstruite champ par champ */
  function validate(input, scope){
    scope = scope === 'manager' ? 'manager' : 'public';
    const errs = []; let raw = input;
    if(typeof input === 'string'){ const p = parse(input); if(!p.ok) return { ok: false, errors: ['Code invalide (JSON) : ' + p.err], spec: null }; raw = p.v; }
    if(!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, errors: ['Le code doit décrire un objet { … }.'], spec: null };
    Object.keys(raw).forEach(k => { if(TOP.indexOf(k) < 0) errs.push('Champ « ' + String(k).slice(0, 24) + ' » inconnu (permis : ' + TOP.join(', ') + ').'); });
    const s = {};
    s.name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 60) : 'Animation sans nom';
    if(raw.desc !== undefined){ if(typeof raw.desc !== 'string') errs.push('« desc » : texte attendu.'); else s.desc = raw.desc.slice(0, 200); }
    const zk = Object.keys(ZONES[scope]).concat(scope === 'public' ? ['page'] : [], ['selector']);
    if(zk.indexOf(raw.target) < 0) errs.push('« target » : choisissez parmi ' + zk.join(', ') + '.'); else s.target = raw.target;
    if(raw.target === 'selector'){ if(typeof raw.selector !== 'string' || !SEL_RE.test(raw.selector.trim())) errs.push('« selector » : classes, identifiants et balises uniquement (ex. ".product-card > img"), 4 niveaux maximum.'); else s.selector = raw.selector.trim(); }
    s.trigger = raw.trigger === undefined ? 'enter' : raw.trigger; if(TRIGGERS.indexOf(s.trigger) < 0){ errs.push('« trigger » : ' + TRIGGERS.join(', ') + '.'); s.trigger = 'enter'; }
    [['duration', .05, 6, .7], ['delay', 0, 5, 0], ['stagger', 0, .5, .06], ['intensity', .2, 2, 1], ['limit', 1, 80, 40]].forEach(a => { const v = raw[a[0]]; if(v === undefined) s[a[0]] = a[3]; else if(!num(v, a[1], a[2])) { errs.push('« ' + a[0] + ' » : nombre entre ' + a[1] + ' et ' + a[2] + '.'); s[a[0]] = a[3]; } else s[a[0]] = v; });
    const e = raw.ease === undefined ? 'smooth' : raw.ease;
    if(typeof e === 'string' && EASES[e]) s.ease = e; else if(typeof e === 'string' && /^cubic-bezier\(\s*-?[\d.]+\s*,\s*-?[\d.]+\s*,\s*-?[\d.]+\s*,\s*-?[\d.]+\s*\)$/.test(e) && e.match(/-?[\d.]+/g).every(n => Math.abs(+n) <= 3)) s.ease = e.replace(/\s+/g, ''); else { errs.push('« ease » : ' + Object.keys(EASES).join(', ') + ' ou cubic-bezier(a,b,c,d).'); s.ease = 'smooth'; }
    s.iterations = raw.iterations === undefined ? 1 : raw.iterations; if(!(Number.isInteger(s.iterations) && s.iterations >= 1 && s.iterations <= 10)){ errs.push('« iterations » : entier de 1 à 10.'); s.iterations = 1; }
    s.direction = raw.direction === undefined ? 'normal' : raw.direction; if(['normal', 'reverse', 'alternate'].indexOf(s.direction) < 0){ errs.push('« direction » : normal, reverse ou alternate.'); s.direction = 'normal'; }
    if(raw.origin !== undefined){ if(ORIGINS.indexOf(raw.origin) < 0) errs.push('« origin » : ' + ORIGINS.join(', ') + '.'); else s.origin = raw.origin; }
    if(raw.target === 'page'){
      s.variant = raw.variant === undefined ? 'curtain' : raw.variant; if(['curtain', 'wipe', 'iris', 'fade'].indexOf(s.variant) < 0){ errs.push('« variant » : curtain, wipe, iris ou fade.'); s.variant = 'curtain'; }
      s.color = raw.color === undefined ? '#0a0a0a' : raw.color; if(typeof s.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(s.color)){ errs.push('« color » : couleur #rrggbb.'); s.color = '#0a0a0a'; }
    } else {
      if(raw.variant !== undefined || raw.color !== undefined) errs.push('« variant » et « color » ne concernent que target "page".');
      if(raw.keyframes !== undefined){
        if(!Array.isArray(raw.keyframes) || raw.keyframes.length < 2 || raw.keyframes.length > 8) errs.push('« keyframes » : 2 à 8 images-clés.');
        else { s.keyframes = raw.keyframes.map((f, i) => frame(f, 'keyframes[' + i + ']', errs)); }
        if(raw.from !== undefined || raw.to !== undefined) errs.push('Utilisez soit from/to, soit keyframes.');
      } else {
        if(raw.from === undefined && raw.to === undefined) errs.push('Décrivez au moins « from » ou « to » (ou « keyframes »).');
        s.from = frame(raw.from, 'from', errs); s.to = frame(raw.to, 'to', errs);
      }
    }
    return { ok: errs.length === 0, errors: errs, spec: errs.length ? null : s };
  }

  /* ----- compilation vers les images-clés Web Animations ----- */
  const ID = { opacity: 1, x: 0, y: 0, scale: 1, scaleX: 1, scaleY: 1, rotate: 0, skewX: 0, skewY: 0, blur: 0, brightness: 1, saturate: 1 };
  function toKf(f, k, full){
    const o = {}; const g = p => f[p] !== undefined ? f[p] : (full ? ID[p] : undefined);
    const I = k;
    const x = g('x'), y = g('y'), sc = g('scale'), sx = g('scaleX'), sy = g('scaleY'), r = g('rotate'), kx = g('skewX'), ky = g('skewY'), b = g('blur'), br = g('brightness'), sa = g('saturate');
    const t = [];
    if(x !== undefined || y !== undefined) t.push('translate(' + ((x || 0) * I).toFixed(2) + 'px,' + ((y || 0) * I).toFixed(2) + 'px)');
    if(r !== undefined) t.push('rotate(' + (r * I).toFixed(2) + 'deg)');
    if(kx !== undefined) t.push('skewX(' + (kx * I).toFixed(2) + 'deg)'); if(ky !== undefined) t.push('skewY(' + (ky * I).toFixed(2) + 'deg)');
    const sd = v => 1 + (v - 1) * I;
    if(sc !== undefined) t.push('scale(' + Math.max(0, sd(sc)).toFixed(3) + ')'); if(sx !== undefined) t.push('scaleX(' + Math.max(0, sd(sx)).toFixed(3) + ')'); if(sy !== undefined) t.push('scaleY(' + Math.max(0, sd(sy)).toFixed(3) + ')');
    if(t.length) o.transform = t.join(' ');
    const fl = []; if(b !== undefined) fl.push('blur(' + (b * I).toFixed(2) + 'px)'); if(br !== undefined) fl.push('brightness(' + br + ')'); if(sa !== undefined) fl.push('saturate(' + sa + ')');
    if(fl.length) o.filter = fl.join(' ');
    if(f.opacity !== undefined || full) o.opacity = g('opacity');
    if(f.clip !== undefined) o.clipPath = f.clip; else if(full && false) o.clipPath = 'none';
    if(f.offset !== undefined) o.offset = f.offset;
    return o;
  }
  function compile(spec){
    const k = spec.intensity;
    if(spec.keyframes){ const used = {}; spec.keyframes.forEach(f => Object.keys(f).forEach(p => { used[p] = 1; }));
      const fullF = f => { const o = Object.assign({}, f); Object.keys(used).forEach(p => { if(o[p] === undefined && ID[p] !== undefined) o[p] = ID[p]; }); if(used.clip && o.clip === undefined) o.clip = 'inset(0% 0% 0% 0%)'; return o; };
      return spec.keyframes.map(f => toKf(fullF(f), k, false)); }
    const used = {}; [spec.from, spec.to].forEach(f => Object.keys(f || {}).forEach(p => { used[p] = 1; }));
    const fill = f => { const o = Object.assign({}, f); Object.keys(used).forEach(p => { if(o[p] === undefined && ID[p] !== undefined) o[p] = ID[p]; }); if(used.clip && o.clip === undefined) o.clip = 'inset(0% 0% 0% 0%)'; return o; };
    return [toKf(fill(spec.from), k, false), toKf(fill(spec.to), k, false)];
  }
  const isIdentity = spec => { const last = spec.keyframes ? spec.keyframes[spec.keyframes.length - 1] : spec.to; return Object.keys(last || {}).every(p => p === 'offset' || (p === 'clip' ? /^inset\(0%?\s+0%?\s+0%?\s+0%?\)$/.test(last[p]) : last[p] === ID[p])) ; };

  /* ----- exécution ----- */
  let ST = null;
  function uninstall(){ if(!ST) return; ST.off.forEach(f => { try{ f(); }catch(e){} }); ST.anims.forEach(a => { try{ a.cancel(); }catch(e){} }); ST.nodes.forEach(n => { try{ n.remove(); }catch(e){} }); ST = null; }
  function zoneSel(spec, scope){ return spec.target === 'selector' ? spec.selector : ZONES[scope][spec.target][0]; }
  function animOpts(spec, i){ return { duration: spec.duration * 1000, delay: (spec.delay + i * spec.stagger) * 1000, easing: EASES[spec.ease] || spec.ease, fill: 'both', iterations: spec.iterations, direction: spec.direction }; }
  function makeAnim(el, spec, i, keep){
    const kf = compile(spec); if(spec.origin) el.style.transformOrigin = '';
    let a; try{ a = el.animate(kf, animOpts(spec, i)); }catch(e){ return null; }
    if(spec.origin){ /* l'origine est appliquée via une règle temporaire : on la pose en style inline annulé à la fin */ const prev = el.style.transformOrigin; el.style.transformOrigin = spec.origin; ST.restore.push(() => { el.style.transformOrigin = prev; }); }
    ST.anims.add(a); if(isIdentity(spec) && spec.iterations <= 10) a.onfinish = () => { try{ a.cancel(); }catch(e){} ST.anims.delete(a); };
    return a;
  }
  function pageTransition(spec, trigger){
    const ov = document.createElement('div'); ov.setAttribute('aria-hidden', 'true'); ov.dataset.slxPage = '1';
    ov.style.cssText = 'position:fixed;inset:0;z-index:2147482000;pointer-events:none;background:' + spec.color + ';opacity:1';
    document.body.appendChild(ov); ST.nodes.push(ov);
    const d = spec.duration * 1000, ease = EASES[spec.ease] || spec.ease, V = spec.variant;
    const hide = V === 'iris' ? 'circle(0% at 50% 50%)' : V === 'wipe' ? 'inset(0 0 0 100%)' : 'inset(100% 0 0 0)', show = V === 'iris' ? 'circle(150% at 50% 50%)' : 'inset(0 0 0 0)', out = V === 'iris' ? 'circle(0% at 50% 50%)' : V === 'wipe' ? 'inset(0 100% 0 0)' : 'inset(0 0 100% 0)';
    const reveal = () => { if(V === 'fade'){ const a = ov.animate([{ opacity: 1 }, { opacity: 0 }], { duration: d, easing: ease, fill: 'forwards' }); a.onfinish = () => { ov.style.display = 'none'; }; return a; }
      ov.style.clipPath = show; const a = ov.animate([{ clipPath: show }, { clipPath: out }], { duration: d, easing: ease, fill: 'forwards' }); a.onfinish = () => { ov.style.display = 'none'; }; return a; };
    const cover = cb => { ov.style.display = ''; if(V === 'fade'){ const a = ov.animate([{ opacity: 0 }, { opacity: 1 }], { duration: d * .5, easing: ease, fill: 'forwards' }); a.onfinish = cb; return; } ov.style.clipPath = hide; const a = ov.animate([{ clipPath: hide }, { clipPath: show }], { duration: d * .5, easing: ease, fill: 'forwards' }); a.onfinish = cb; };
    ov.style.display = 'none';
    if(spec.trigger === 'load'){ ov.style.display = ''; const a = reveal(); ST.anims.add(a); }
    if(spec.trigger === 'click' || spec.trigger === 'enter' || spec.trigger === 'hover'){
      const h = ev => { const t = ev.target.closest && ev.target.closest('a[href^="#"]:not([href="#"]), .nav-link, .cat-pill'); if(!t || ov.__busy) return; ov.__busy = 1; cover(() => { const a = reveal(); a.onfinish = () => { ov.style.display = 'none'; ov.__busy = 0; }; }); };
      document.addEventListener('click', h, true); ST.off.push(() => document.removeEventListener('click', h, true));
    }
  }
  function install(list, scope, opts){
    uninstall(); opts = opts || {}; scope = scope === 'manager' ? 'manager' : 'public';
    if(RM() || !Array.isArray(list) || !list.length) return false;
    ST = { off: [], anims: new Set(), nodes: [], restore: [], hover: new WeakMap() };
    ST.off.push(() => { ST.restore.forEach(f => f()); });
    const specs = list.slice(0, 40).map(s => { const v = validate(s, scope); return v.ok ? v.spec : null; }).filter(Boolean).filter(s => s.enabled !== false);
    const gate = () => !opts.gate || opts.gate();
    const cap = COARSE() ? 14 : 80;
    const done = new WeakMap(); const mark = (el, i) => { const l = done.get(el) || []; if(l.indexOf(i) >= 0) return false; l.push(i); done.set(el, l); return true; };
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(en => { if(!en.isIntersecting) return; io.unobserve(en.target); const a = en.target.__slxPend; if(a){ en.target.__slxPend = null; try{ a.play(); }catch(e){} } }), { threshold: .12, rootMargin: '0px 0px -6% 0px' }) : null; if(io) ST.off.push(() => io.disconnect());
    const els = (s, root) => { let r = []; try{ const sel = zoneSel(s, scope); r = [...(root || document).querySelectorAll(sel)]; if(root && root.matches && root.matches(sel)) r.unshift(root); }catch(e){} return r.slice(0, Math.min(s.limit, cap)); };
    const attach = (s, i, root) => {
      if(s.target === 'page') return;
      const list2 = els(s, root).filter(e => mark(e, i)); if(!list2.length) return;
      list2.forEach((e, n) => {
        if(s.trigger === 'load'){ if(gate()) makeAnim(e, s, n); }
        else if(s.trigger === 'enter'){ const a = makeAnim(e, s, n); if(!a) return; if(io){ a.pause(); e.__slxPend = a; io.observe(e); } }
        else if(s.trigger === 'click'){ e.__slxC = e.__slxC || []; e.__slxC.push([s, n]); }
        else if(s.trigger === 'hover'){ e.__slxH = e.__slxH || []; e.__slxH.push(s); }
        else if(s.trigger === 'scroll'){ const sp = Object.assign({}, s, { duration: 1, delay: 0, stagger: 0, iterations: 1 }); const a = makeAnim(e, sp, 0); if(!a) return; a.pause(); a.currentTime = 0; e.__slxS = a; ST.scroll = ST.scroll || new Set(); ST.scroll.add(e); }
      });
    };
    const scanAll = root => specs.forEach((s, i) => attach(s, i, root));
    specs.forEach(s => { if(s.target === 'page') pageTransition(s); });
    scanAll();
    // contenus ajoutés plus tard (cartes, panier, fenêtres) : scan limité
    let pend = 0; const mo = new MutationObserver(recs => { if(pend) return; pend = setTimeout(() => { pend = 0; recs.forEach(r => r.addedNodes.forEach(n => { if(n.nodeType === 1 && n.id !== 'slx-v6-elements') scanAll(n); })); }, 60); });
    mo.observe(document.body, { childList: true, subtree: true }); ST.off.push(() => { mo.disconnect(); clearTimeout(pend); });
    const onDown = ev => { let t = ev.target; while(t && t !== document.body){ if(t.__slxC && gate()) t.__slxC.forEach(c => makeAnim(t, Object.assign({}, c[0], { delay: 0 }), 0)); t = t.parentElement; } };
    document.addEventListener('pointerdown', onDown, true); ST.off.push(() => document.removeEventListener('pointerdown', onDown, true));
    const hov = (ev, on) => { let t = ev.target.closest ? ev.target : ev.target.parentElement; while(t && t !== document.body){ if(t.__slxH){ if(on && ev.relatedTarget && t.contains(ev.relatedTarget)) { t = t.parentElement; continue; } if(!on && ev.relatedTarget && t.contains(ev.relatedTarget)){ t = t.parentElement; continue; }
        let a = ST.hover.get(t); if(!a){ const sp = Object.assign({}, t.__slxH[0], { delay: 0, iterations: 1 }); a = t.animate(compile(sp), { duration: sp.duration * 1000, easing: EASES[sp.ease] || sp.ease, fill: 'both' }); a.pause(); ST.anims.add(a); ST.hover.set(t, a); }
        a.playbackRate = on ? 1 : -1; if(on || a.currentTime) a.play(); }
      t = t.parentElement; } };
    if(specs.some(s => s.trigger === 'hover') && matchMedia('(hover:hover)').matches){ const o1 = e => hov(e, true), o2 = e => hov(e, false); document.addEventListener('pointerover', o1, true); document.addEventListener('pointerout', o2, true); ST.off.push(() => { document.removeEventListener('pointerover', o1, true); document.removeEventListener('pointerout', o2, true); }); }
    if(specs.some(s => s.trigger === 'scroll')){ let raf = 0; const upd = () => { raf = 0; const vh = innerHeight; (ST && ST.scroll || []).forEach(e => { const r = e.getBoundingClientRect(); const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height))); try{ e.__slxS.currentTime = p; }catch(x){} }); };
      const sc = () => { if(!raf) raf = requestAnimationFrame(upd); }; addEventListener('scroll', sc, { passive: true }); addEventListener('resize', sc); ST.off.push(() => { removeEventListener('scroll', sc); removeEventListener('resize', sc); cancelAnimationFrame(raf); }); upd(); }
    return true;
  }
  /* aperçu immédiat d'un code sur un élément (éditeur, bibliothèque) */
  function preview(spec, els, scope){ const v = validate(spec, scope); if(!v.ok) return false; const s = Object.assign({}, v.spec); const out = []; els.forEach((e, n) => { try{ const a = e.animate(compile(s), animOpts(s, n)); out.push(a); }catch(x){} }); return out; }
  root.SLX_SCRIPT = { ZONES, validate, compile, install, uninstall, preview, parse, stripComments, EASES, TRIGGERS, PROPS, supported: () => !RM() };
})(typeof window !== 'undefined' ? window : globalThis);
