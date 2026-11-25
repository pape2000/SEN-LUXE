/* SEN LUXE v6 — Moteur de mouvement (partagé gestionnaire / site public).
 * Ce ne sont pas des « effets CSS » plaqués : chaque comportement réagit à l'état réel de l'interface
 * (valeur qui change, élément qui entre à l'écran, liste réordonnée, sélection, clic, notification…).
 * Uniquement transform / opacity / clip-path (compositeur) ; désactivé si « réduire les mouvements » ;
 * allégé sur mobile. Aucune donnée n'est exécutée : la configuration ne contient que des identifiants et des nombres.
 * Source unique : insérée dans index.html par scripts/sync-v6.py. */
(function(root){
  'use strict';
  const clamp = (v, a, b, d) => { v = Number(v); if(!isFinite(v)) v = d; return Math.min(b, Math.max(a, v)); };
  const RM = () => { try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } };
  const COARSE = () => { try{ return matchMedia('(pointer:coarse)').matches || innerWidth < 700; }catch(e){ return false; } };
  const EASES = { smooth: 'cubic-bezier(.22,.8,.2,1)', spring: 'cubic-bezier(.34,1.56,.64,1)', snap: 'cubic-bezier(.7,0,.2,1)', soft: 'cubic-bezier(.4,0,.2,1)', linear: 'linear' };
  const DIRS = ['up', 'down', 'left', 'right', 'diagonal'];
  const norm = o => {
    o = o || {};
    return { dur: clamp(o.dur, .1, 4, .6), speed: clamp(o.speed, .25, 3, 1), int: clamp(o.int, .2, 2, 1), delay: clamp(o.delay, 0, 3, 0), stagger: clamp(o.stagger, 0, .3, .06),
      dir: DIRS.indexOf(o.dir) >= 0 ? o.dir : 'up', ease: EASES[o.ease] ? o.ease : 'smooth', trig: ['load', 'enter', 'change', 'hover', 'click'].indexOf(o.trig) >= 0 ? o.trig : 'enter', life: clamp(o.life, 1000, 12000, 3500) };
  };
  const ms = o => o.dur * 1000 / o.speed;
  const A = (el, kf, o, extra) => { try{ return el.animate(kf, Object.assign({ duration: ms(o), delay: o.delay * 1000, easing: EASES[o.ease], fill: 'both' }, extra || {})); }catch(e){ return null; } };
  const vec = (dir, d, rev) => { const s = rev ? -1 : 1; return dir === 'up' ? [0, d * s] : dir === 'down' ? [0, -d * s] : dir === 'left' ? [d * s, 0] : dir === 'right' ? [-d * s, 0] : [d * .7 * s, d * .7 * s]; };

  /* ---------- nombres : on lit, on interpole, on remet exactement le format d'origine ---------- */
  function numNode(el){ const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n; while((n = w.nextNode())){ if(/\d/.test(n.nodeValue)) return n; } return null; }
  function parseNum(txt){
    const m = /(\d[\d\s  .,]*\d|\d)/.exec(txt); if(!m) return null;
    let raw = m[1], dec = 0, sepT = '';
    const dm = /[.,](\d{1,2})$/.exec(raw); if(dm){ dec = dm[1].length; }
    const th = /[\s  ]/.exec(raw); if(th) sepT = th[0]; else { const t2 = /^\d{1,3}([.,])\d{3}/.exec(raw); if(t2 && !dm) sepT = t2[1]; }
    const decSep = dm ? raw[raw.length - dec - 1] : ',';
    const clean = raw.replace(/[\s  ]/g, '').replace(new RegExp(dec ? '[.,](?=\\d{' + dec + '}$)' : '$^'), '.').replace(/[.,]/g, m2 => m2 === '.' && dec ? '.' : '');
    const val = parseFloat(dec ? clean : clean.replace(/[.,]/g, ''));
    if(!isFinite(val)) return null;
    return { pre: txt.slice(0, m.index), post: txt.slice(m.index + raw.length), val, dec, sepT, decSep };
  }
  function fmt(p, v){
    let s = Math.abs(v).toFixed(p.dec); let [i, d] = s.split('.');
    if(p.sepT) i = i.replace(/\B(?=(\d{3})+(?!\d))/g, p.sepT);
    return p.pre + (v < 0 ? '-' : '') + i + (d ? p.decSep + d : '') + p.post;
  }
  const MINE = new WeakSet();
  function countTo(el, from, to, o){
    const n = numNode(el); if(!n){ return; } const orig = n.nodeValue, p = parseNum(orig); if(!p) return;
    if(!isFinite(from)) from = 0; if(from === to) return;
    const d = ms(o), t0 = performance.now() + o.delay * 1000, ease = t => 1 - Math.pow(1 - t, 4);
    if(el.__cnt) cancelAnimationFrame(el.__cnt);
    const step = now => {
      const t = clamp((now - t0) / d, 0, 1, 0); const v = from + (to - from) * ease(t);
      MINE.add(n); n.nodeValue = t >= 1 ? orig : fmt(p, p.dec ? v : Math.round(v));
      if(t < 1) el.__cnt = requestAnimationFrame(step); else el.__cnt = 0;
    };
    el.__cnt = requestAnimationFrame(step);
  }
  function rollText(el, o){
    const old = el.cloneNode(true); const r = el.getBoundingClientRect(); if(!r.width) return;
    old.style.cssText = 'position:fixed;left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;margin:0;pointer-events:none;z-index:99999;color:inherit';
    document.body.appendChild(old); const dy = 12 * o.int;
    A(old, [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-' + dy + 'px)' }], o).onfinish = () => old.remove();
    A(el, [{ opacity: 0, transform: 'translateY(' + dy + 'px)' }, { opacity: 1, transform: 'none' }], o);
  }

  /* ---------- comportements ---------- */
  const B = {};
  const def = (id, name, cat, kind, desc, trigs, params, run) => { B[id] = { id, name, cat, kind, desc, trigs, params, run }; };

  def('count-up', 'Compteur vivant', 'Chiffres', 'number', 'Les chiffres montent (ou descendent) vers leur valeur ; chaque mise à jour est interpolée au lieu de sauter.', ['enter', 'change'], ['dur', 'speed', 'delay', 'ease'],
    (el, o, ctx) => { const n = numNode(el), p = n && parseNum(n.nodeValue); if(!p) return rollText(el, o); countTo(el, ctx && isFinite(ctx.from) ? ctx.from : 0, p.val, o); });
  def('value-roll', 'Valeur qui défile', 'Chiffres', 'number', 'L\'ancienne valeur s\'échappe vers le haut, la nouvelle arrive du bas (compteurs, étiquettes, états).', ['change', 'enter'], ['dur', 'speed', 'int', 'ease'], (el, o) => rollText(el, o));
  def('bar-fill', 'Progression qui se remplit', 'Indicateurs', 'bar', 'La barre se remplit depuis son origine ; lors d\'un changement, elle glisse de l\'ancienne à la nouvelle valeur.', ['enter', 'change'], ['dur', 'speed', 'delay', 'ease'],
    (el, o, ctx) => { el.style.transformOrigin = 'left center'; const k = ctx && ctx.ratio > 0 && ctx.ratio < 5 ? ctx.ratio : 0; A(el, [{ transform: 'scaleX(' + k + ')' }, { transform: 'scaleX(1)' }], o); });
  def('chart-draw', 'Graphique qui se construit', 'Indicateurs', 'chart', 'Les courbes se tracent, les barres montent une à une, les secteurs se déploient.', ['enter', 'change'], ['dur', 'speed', 'stagger', 'ease'],
    (el, o) => {
      const shapes = [...el.querySelectorAll('polyline,path,line,rect,circle')].filter(s => !s.closest('defs'));
      let i = 0;
      shapes.forEach(s => {
        const tag = s.tagName.toLowerCase(), stroke = s.getAttribute('stroke'), fill = s.getAttribute('fill');
        const oo = Object.assign({}, o, { delay: o.delay + i * o.stagger });
        if((tag === 'polyline' || tag === 'path') && stroke && stroke !== 'none' && (fill === 'none' || tag === 'polyline') && s.getTotalLength){
          const L = s.getTotalLength(); s.style.strokeDasharray = L; A(s, [{ strokeDashoffset: L }, { strokeDashoffset: 0 }], oo).onfinish = () => { s.style.strokeDasharray = ''; }; i++;
        } else if(tag === 'rect'){ s.style.transformBox = 'fill-box'; s.style.transformOrigin = 'bottom'; A(s, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], oo); i++; }
        else if(tag === 'circle' || tag === 'path'){ s.style.transformBox = 'fill-box'; s.style.transformOrigin = 'center'; A(s, [{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1)' }], Object.assign({}, oo, { ease: 'spring' })); i++; }
      });
    });
  def('select-ring', 'Sélection nette', 'États', 'select', 'Un élément sélectionné change d\'état avec un anneau doré qui se propage et un léger ressort.', ['change', 'click'], ['dur', 'speed', 'int', 'ease'],
    (el, o) => { A(el, [{ transform: 'scale(' + (1 - .04 * o.int) + ')', boxShadow: '0 0 0 0 rgba(212,175,55,.65)' }, { transform: 'scale(1)', boxShadow: '0 0 0 ' + Math.round(10 * o.int) + 'px rgba(212,175,55,0)' }], Object.assign({}, o, { ease: 'spring' })); });
  def('cards-cascade', 'Cascade de cartes', 'Cartes', 'list', 'Les cartes se construisent par vagues (ligne après ligne, colonne après colonne) : masque qui s\'ouvre, inclinaison qui se redresse, image qui se pose.', ['enter', 'load'], ['dur', 'speed', 'int', 'dir', 'stagger', 'ease'],
    (els, o) => {
      els = [].concat(els); const lim = COARSE() ? 10 : 28; const tops = [...new Set(els.map(e => Math.round(e.offsetTop / 20)))].sort((a, b) => a - b);
      els.slice(0, lim).forEach((e, i) => {
        const row = Math.max(0, tops.indexOf(Math.round(e.offsetTop / 20))), col = els.filter(x => Math.round(x.offsetTop / 20) === Math.round(e.offsetTop / 20)).indexOf(e);
        const [dx, dy] = vec(o.dir, 34 * o.int), d = (row * .7 + col) * o.stagger, oo = Object.assign({}, o, { delay: o.delay + d }), tilt = (o.dir === 'left' ? -1 : 1) * 2.2 * o.int;
        A(e, [{ opacity: 0, transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(' + tilt + 'deg) scale(.94)', clipPath: 'inset(10% 6% 14% 6% round 8px)' }, { opacity: 1, transform: 'none', clipPath: 'inset(0% 0% 0% 0% round 0px)' }], oo);
        const img = e.querySelector('img'); if(img) A(img, [{ transform: 'scale(1.16)' }, { transform: 'scale(1)' }], Object.assign({}, oo, { dur: o.dur * 1.5 }));
      });
    });
  def('list-flip', 'Réorganisation fluide', 'Cartes', 'list', 'Quand une liste change (tri, filtre, nouvelle commande), chaque élément glisse vers sa nouvelle place au lieu de sauter.', ['change'], ['dur', 'speed', 'ease'], () => {});
  def('btn-press', 'Réaction de bouton', 'Boutons', 'press', 'Appui précis (compression) puis onde dorée qui part exactement du point touché.', ['click'], ['dur', 'speed', 'int'],
    (el, o, ctx) => {
      A(el, [{ transform: 'scale(1)' }, { transform: 'scale(' + (1 - .05 * o.int) + ')', offset: .3 }, { transform: 'scale(1)' }], Object.assign({}, o, { ease: 'spring' }));
      const r = el.getBoundingClientRect(), x = ctx && ctx.x != null ? ctx.x : r.left + r.width / 2, y = ctx && ctx.y != null ? ctx.y : r.top + r.height / 2, s = Math.max(r.width, r.height) * 1.4 * o.int;
      const d = document.createElement('span'); d.setAttribute('aria-hidden', 'true'); d.style.cssText = 'position:fixed;left:' + (x - s / 2) + 'px;top:' + (y - s / 2) + 'px;width:' + s + 'px;height:' + s + 'px;border-radius:50%;border:1.5px solid rgba(212,175,55,.9);pointer-events:none;z-index:2147483000';
      document.body.appendChild(d); const a = A(d, [{ transform: 'scale(.1)', opacity: .9 }, { transform: 'scale(1)', opacity: 0 }], Object.assign({}, o, { delay: 0, ease: 'smooth' })); (a || {}).onfinish = () => d.remove(); if(!a) d.remove();
    });
  def('toast-spring', 'Notification qui arrive', 'Notifications', 'toast', 'La notification entre en ressort au bon moment ; une jauge dorée indique le temps restant.', ['load'], ['dur', 'speed', 'int', 'life'],
    (el, o) => {
      A(el, [{ opacity: 0, transform: 'translateY(' + 26 * o.int + 'px) scale(.94)' }, { opacity: 1, transform: 'none' }], Object.assign({}, o, { ease: 'spring' }));
      if(getComputedStyle(el).position === 'static') el.style.position = 'relative';
      const g = document.createElement('i'); g.style.cssText = 'position:absolute;left:0;bottom:0;height:2px;width:100%;background:#d4af37;transform-origin:left;pointer-events:none';
      el.appendChild(g); A(g, [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], Object.assign({}, o, { dur: o.life / 1000, speed: 1, delay: .15, ease: 'linear' }));
    });
  def('logo-build', 'Logo SEN LUXE : construction', 'Logo', 'logo', 'SEN monte, LUXE descend, puis un éclat doré traverse les lettres une à une, comme la facette d\'un bijou.', ['load', 'hover', 'enter'], ['dur', 'speed', 'int', 'stagger'],
    (el, o) => {
      const parts = [...el.querySelectorAll('i,b')]; if(!parts.length || el.__lb) return; el.__lb = 1;
      const saved = parts.map(p => p.innerHTML), letters = []; const t0 = Date.now();
      parts.forEach((p, k) => {
        const txt = p.textContent; p.textContent = ''; const prev = p.style.cssText; p.style.display = 'inline-block'; p.style.overflow = 'hidden'; p.style.verticalAlign = 'bottom'; p.dataset.v6prev = prev;
        [...txt].forEach((c, i) => { const s = document.createElement('span'); s.textContent = c; s.style.display = 'inline-block'; p.appendChild(s); letters.push([s, k, i]); });
      });
      let end = 0;
      letters.forEach(([s, k, i]) => {
        const oo = Object.assign({}, o, { delay: o.delay + (k * .12 + i * o.stagger), ease: 'smooth' });
        A(s, [{ transform: 'translateY(' + (k ? -115 : 115) + '%)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], oo);
        end = Math.max(end, oo.delay * 1000 + ms(o));
      });
      letters.forEach(([s], j) => {
        const base = getComputedStyle(s).color;
        A(s, [{ color: base }, { color: '#f7e7ad', transform: 'translateY(-' + 2 * o.int + 'px)' }, { color: base }], Object.assign({}, o, { dur: .5, speed: o.speed, delay: (end / 1000 + j * .05) / 1, ease: 'soft', fill: 'none' }), { fill: 'none' });
      });
      setTimeout(() => { parts.forEach((p, k) => { p.innerHTML = saved[k]; if(p.dataset.v6prev) p.style.cssText = p.dataset.v6prev; else p.removeAttribute('style'); delete p.dataset.v6prev; }); el.__lb = 0; }, end + 500 + letters.length * 50 + 120);
    });
  def('text-lines', 'Titre qui se compose', 'Texte', 'text', 'Les mots d\'un titre sortent d\'un masque, un par un, avec un léger décalage de rythme.', ['load', 'enter'], ['dur', 'speed', 'int', 'dir', 'stagger'],
    (el, o) => {
      if(el.__tl || el.children.length > 0 && !el.querySelector('br')) return; el.__tl = 1; const html = el.innerHTML;
      const words = el.textContent.trim().split(/\s+/); el.textContent = '';
      const spans = words.map((w, i) => { const m = document.createElement('span'); m.style.cssText = 'display:inline-block;overflow:hidden;vertical-align:bottom;padding-bottom:.12em;margin-bottom:-.12em'; const s = document.createElement('span'); s.style.display = 'inline-block'; s.textContent = w; m.appendChild(s); el.appendChild(m); if(i < words.length - 1) el.appendChild(document.createTextNode(' ')); return s; });
      let end = 0; spans.forEach((s, i) => { const oo = Object.assign({}, o, { delay: o.delay + i * (o.stagger + .02) }); const [dx, dy] = vec(o.dir === 'diagonal' ? 'up' : o.dir, 105, false); A(s, [{ transform: o.dir === 'left' || o.dir === 'right' ? 'translateX(' + dx + '%)' : 'translateY(' + (dy > 0 ? 105 : -105) + '%)' }, { transform: 'none' }], oo); end = oo.delay * 1000 + ms(o); });
      setTimeout(() => { el.innerHTML = html; el.__tl = 0; }, end + 150);
    });
  def('section-curtain', 'Rideau de section', 'Sections', 'section', 'Une section se dévoile comme un rideau qui s\'ouvre, avec un filet doré sur le bord qui avance.', ['enter', 'load'], ['dur', 'speed', 'int', 'dir', 'ease'],
    (el, o) => {
      const h = o.dir === 'left' || o.dir === 'right', from = o.dir === 'left' ? 'inset(0 0 0 100%)' : o.dir === 'right' ? 'inset(0 100% 0 0)' : o.dir === 'down' ? 'inset(100% 0 0 0)' : 'inset(0 0 100% 0)';
      A(el, [{ clipPath: from, opacity: .2 }, { clipPath: 'inset(0 0 0 0)', opacity: 1 }], o);
      const kids = [...el.children].slice(0, 6); kids.forEach((k, i) => { const [dx, dy] = vec(o.dir, 18 * o.int); A(k, [{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], Object.assign({}, o, { delay: o.delay + .08 + i * .05 })); });
    });
  def('cart-bump', 'Panier qui réagit', 'Boutons', 'cart', 'Le compteur du panier rebondit et roule vers son nouveau chiffre quand un article est ajouté.', ['change'], ['dur', 'speed', 'int'],
    (el, o) => { A(el, [{ transform: 'scale(1)' }, { transform: 'scale(' + (1 + .6 * o.int) + ')', offset: .4 }, { transform: 'scale(1)' }], Object.assign({}, o, { ease: 'spring' })); });
  def('nav-underline', 'Soulignement guidé', 'Navigation', 'nav', 'Un filet doré se trace sous le lien au survol et repart dans le sens du mouvement de la souris.', ['hover'], ['dur', 'speed'], () => {});

  /* ---------- exécution manuelle (aperçus de la bibliothèque) ---------- */
  function run(id, el, opts, ctx){ const b = B[id]; if(!b || !el) return false; if(RM() && !(ctx && ctx.force)) return false; try{ b.run(el, norm(opts), ctx || {}); return true; }catch(e){ return false; } }

  /* ---------- runtime : s'accroche aux éléments réels ---------- */
  let ST = null;
  function uninstall(){ if(!ST) return; ST.mo && ST.mo.disconnect(); ST.io && ST.io.disconnect(); ST.off.forEach(f => f()); ST = null; const s = document.getElementById('slx-motion-css'); if(s) s.remove(); }
  function install(config, targets, opts){
    uninstall(); opts = opts || {};
    if(!config || typeof config !== 'object' || RM()) return false;
    const act = Object.keys(config).filter(k => targets[k] && config[k] && config[k].on !== false && B[config[k].b] && (!targets[k].kind || targets[k].kind === B[config[k].b].kind));
    if(!act.length) return false;
    ST = { off: [], seen: new WeakMap(), last: new WeakMap() };
    const gate = () => !opts.gate || opts.gate();
    const cfg = k => norm(config[k]), beh = k => B[config[k].b];
    const css = []; const rects = new WeakMap();
    const match = (el, k) => { try{ return el.matches && el.matches(targets[k].sel); }catch(e){ return false; } };
    const all = (k, root) => { try{ return [...(root || document).querySelectorAll(targets[k].sel)]; }catch(e){ return []; } };

    // CSS d'interaction pure (soulignement)
    act.forEach(k => { if(config[k].b === 'nav-underline'){ const o = cfg(k); css.push(targets[k].sel + '{background:linear-gradient(#d4af37,#d4af37) left bottom/0 1px no-repeat;transition:background-size ' + ms(o) + 'ms ' + EASES.smooth + ',background-position 0s linear ' + ms(o) + 'ms}' + targets[k].sel.split(',').map(s => s.trim() + ':hover').join(',') + '{background-size:100% 1px;transition:background-size ' + ms(o) + 'ms ' + EASES.smooth + '}'); } });
    if(css.length){ const s = document.createElement('style'); s.id = 'slx-motion-css'; s.textContent = css.join('\n'); document.head.appendChild(s); }

    const enterRun = (k, els) => { if(!gate()) return; const b = beh(k), o = cfg(k); els = els.filter(e => !ST.seen.has(e) || ST.seen.get(e).indexOf(k) < 0); if(!els.length) return;
      els.forEach(e => { const l = ST.seen.get(e) || []; l.push(k); ST.seen.set(e, l); });
      if(b.kind === 'list' && b.id !== 'list-flip'){ b.run(els, o); return; }
      els.slice(0, COARSE() ? 12 : 40).forEach(e => { const n = b.kind === 'number' && numNode(e), p = n && parseNum(n.nodeValue); ST.last.set(e, p ? p.val : null); b.run(e, o, { from: 0, ratio: 0 }); });
    };
    const needIO = act.filter(k => beh(k).trigs.indexOf(cfg(k).trig) >= 0 && (cfg(k).trig === 'enter') && beh(k).kind !== 'toast' && beh(k).kind !== 'press');
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => { es.forEach(en => { if(!en.isIntersecting) return; io.unobserve(en.target); const ks = act.filter(k => match(en.target, k)); ks.forEach(k => enterRun(k, [en.target])); }); }, { threshold: .12 }) : null;
    ST.io = io;

    const scan = (node, initial) => {
      if(node.nodeType !== 1) return;
      act.forEach(k => {
        const b = beh(k), o = cfg(k), els = (match(node, k) ? [node] : []).concat(all(k, node));
        if(!els.length) return;
        if(b.kind === 'toast'){ els.forEach(e => { if(!ST.seen.has(e)){ ST.seen.set(e, [k]); b.run(e, o); } }); return; }
        if(b.kind === 'section' || b.kind === 'logo' && o.trig !== 'hover' || b.kind === 'text'){ els.forEach(e => { if(o.trig === 'load' || !io){ enterRun(k, [e]); } else io.observe(e); }); return; }
        if(b.kind === 'press' || b.kind === 'nav' || b.kind === 'select') return;
        const fresh = els.filter(e => !ST.seen.has(e)); if(!fresh.length) return;
        if(o.trig === 'enter' && io && b.kind !== 'list') fresh.forEach(e => io.observe(e));
        else if(b.kind === 'list' && o.trig === 'enter' && io){ const grp = fresh; grp.forEach(e => { e.style.opacity = '0'; }); let pend = grp.slice(), t; const io2 = new IntersectionObserver(es => { const vis = es.filter(x => x.isIntersecting); if(!vis.length) return; vis.forEach(x => io2.unobserve(x.target)); clearTimeout(t); const vv = vis.map(x => x.target); vv.forEach(e => { e.style.opacity = ''; }); enterRun(k, vv); }, { threshold: .08 }); grp.forEach(e => io2.observe(e)); ST.off.push(() => io2.disconnect()); }
        else enterRun(k, fresh);
      });
    };
    // changements de valeur / de classe / de style / de liste
    const keyOf = e => e.dataset && (e.dataset.id || e.dataset.pid || e.dataset.qv || e.dataset.key || e.dataset.arg) || e.id || null;
    const flipSnap = c => { const m = new Map(); [...c.children].forEach(e => { const k2 = keyOf(e); if(k2) m.set(k2, { x: e.offsetLeft, y: e.offsetTop }); }); c.__snap = m; };
    const onMut = recs => {
      for(const r of recs){
        if(r.type === 'childList'){
          r.addedNodes.forEach(n => scan(n));
          const par = r.target; act.forEach(k => { if(config[k].b === 'list-flip' && par.nodeType === 1){ const host = par.closest ? par.closest(targets[k].sel) || (match(par, k) ? par : null) : null; const cont = host && host.parentElement || null; if(cont && cont.__snap){ const o = cfg(k), snap = cont.__snap; [...cont.children].forEach(e => { const k2 = keyOf(e), s0 = k2 && snap.get(k2); if(s0){ const dx = s0.x - e.offsetLeft, dy = s0.y - e.offsetTop; if(Math.abs(dx) + Math.abs(dy) > 2) A(e, [{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], o); } else if(k2) A(e, [{ opacity: 0, transform: 'scale(.9)' }, { opacity: 1, transform: 'none' }], o); }); flipSnap(cont); } } });
          const t = r.target.nodeType === 1 ? r.target : r.target.parentElement; if(t) act.forEach(k => { const el = t.closest && t.closest(targets[k].sel); if(el && ['number', 'cart'].indexOf(beh(k).kind) >= 0) valueChanged(k, el); });
        } else if(r.type === 'characterData'){
          if(MINE.has(r.target)){ MINE.delete(r.target); continue; }
          const t = r.target.parentElement; if(t) act.forEach(k => { const el = t.closest(targets[k].sel); if(el && ['number', 'cart'].indexOf(beh(k).kind) >= 0) valueChanged(k, el); });
        } else if(r.type === 'attributes'){
          const el = r.target;
          act.forEach(k => { if(!match(el, k)) return; const b = beh(k), o = cfg(k);
            if(b.kind === 'select' && r.attributeName === 'class' && !/\b(active|on|selected)\b/.test(r.oldValue || '') && /\b(active|on|selected)\b/.test(el.className)) b.run(el, o);
            if(b.kind === 'section' && r.attributeName === 'class' && /\bin\b/.test(el.className) && !/\bin\b/.test(r.oldValue || '')){ const sn = ST.seen.get(el) || []; if(sn.indexOf(k) < 0){ sn.push(k); ST.seen.set(el, sn); b.run(el, o); } }
            if(b.kind === 'bar' && r.attributeName === 'style'){ const w = parseFloat(el.style.width), w0 = parseFloat((/width:\s*([\d.]+)%/.exec(r.oldValue || '') || [])[1]); if(isFinite(w) && isFinite(w0) && w0 !== w && w > 0){ b.run(el, o, { ratio: w0 / w }); } }
          });
        }
      }
    };
    const valueChanged = (k, el) => { if(!gate() && cfg(k).trig === 'enter') return; const b = beh(k), o = cfg(k); const n = numNode(el), p = n && parseNum(n.nodeValue); const prev = ST.last.get(el); const nv = p ? p.val : null; if(nv === prev) return; ST.last.set(el, nv); if(!ST.seen.has(el)) return; if(b.kind === 'cart' || b.id === 'value-roll' || !p){ b.run(el, o); if(b.kind === 'cart' && p) {/* chiffre déjà à jour : on rebondit seulement */} } else b.run(el, o, { from: prev }); };
    ST.mo = new MutationObserver(onMut);
    ST.mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'style'], attributeOldValue: true });
    // clics : boutons, sélection
    const onDown = ev => act.forEach(k => { const b = beh(k); if(b.kind !== 'press' && !(b.kind === 'select' && cfg(k).trig === 'click')) return; let el = ev.target.closest && ev.target.closest(targets[k].sel); if(el) b.run(el, cfg(k), { x: ev.clientX, y: ev.clientY }); });
    document.addEventListener('pointerdown', onDown, true); ST.off.push(() => document.removeEventListener('pointerdown', onDown, true));
    const onOver = ev => act.forEach(k => { const b = beh(k); if(b.id !== 'logo-build' || cfg(k).trig !== 'hover') return; const el = ev.target.closest && ev.target.closest(targets[k].sel); if(el) b.run(el, cfg(k)); });
    document.addEventListener('pointerover', onOver, true); ST.off.push(() => document.removeEventListener('pointerover', onOver, true));
    // état initial
    act.forEach(k => { if(config[k].b === 'list-flip') all(k).forEach(e => { if(e.parentElement && !e.parentElement.__snap) flipSnap(e.parentElement); }); });
    document.body.querySelectorAll('*').length < 6000 && scan(document.body, true);
    // marquer les valeurs de départ
    act.forEach(k => { if(['number', 'cart'].indexOf(beh(k).kind) >= 0) all(k).forEach(e => { const n = numNode(e), p = n && parseNum(n.nodeValue); ST.last.set(e, p ? p.val : null); if(!ST.seen.has(e) && beh(k).kind === 'cart') ST.seen.set(e, [k]); }); });
    return true;
  }

  /* ---------- bascule de thème (cercle qui révèle le nouveau thème) ---------- */
  function themeWipe(applyFn, x, y, opts){
    const o = norm(opts || { dur: .7 });
    if(!document.startViewTransition || RM()){ applyFn(); return; }
    const w = innerWidth, h = innerHeight; x = x == null ? w / 2 : x; y = y == null ? h / 2 : y; const R = Math.hypot(Math.max(x, w - x), Math.max(y, h - y));
    let st = document.getElementById('slx-vt'); if(!st){ st = document.createElement('style'); st.id = 'slx-vt'; st.textContent = '::view-transition-old(root),::view-transition-new(root){animation:none;mix-blend-mode:normal}'; document.head.appendChild(st); }
    const t = document.startViewTransition(applyFn);
    t.ready.then(() => { document.documentElement.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + R + 'px at ' + x + 'px ' + y + 'px)'] }, { duration: ms(o), easing: EASES.smooth, pseudoElement: '::view-transition-new(root)' }); }).catch(() => {});
  }


  /* ---------- cibles réelles (sélecteurs fixés ici, jamais issus des données) ---------- */
  const TARGETS = {
    manager: {
      stats:   { sel: '.stat b', kind: 'number', label: 'Chiffres clés (accueil, stocks…)' },
      bars:    { sel: '.bar > i, .progress > i, [role=progressbar] > *', kind: 'bar', label: 'Jauges de progression' },
      charts:  { sel: '.an-svg', kind: 'chart', label: 'Graphiques (statistiques)' },
      cards:   { sel: '#view .mcard, #view .ccard, #view .an-card, #view .stat', kind: 'list', label: 'Cartes et indicateurs (à l\'ouverture d\'une rubrique)' },
      select:  { sel: '.nav button.active, .tabs .on, .v6-tabs .on, .chip.on', kind: 'select', label: 'Élément sélectionné (menu, onglets, filtres)' },
      buttons: { sel: '.btn', kind: 'press', label: 'Boutons' },
      toast:   { sel: '.toast', kind: 'toast', label: 'Notifications' },
      logo:    { sel: '.sidebar .logo-word', kind: 'logo', label: 'Logo SEN LUXE (menu latéral)' }
    },
    public: {
      logo:     { sel: '.logo .logo-word', kind: 'logo', label: 'Logo SEN LUXE (en-tête)' },
      hero:     { sel: '.hero-inner h1', kind: 'text', label: 'Titre de la bannière d\'accueil' },
      sections: { sel: '.reveal', kind: 'section', label: 'Sections de la page' },
      cards:    { sel: '#productGrid > .product-card', kind: 'list', label: 'Cartes produits' },
      prices:   { sel: '.product-card .product-price', kind: 'number', label: 'Prix des produits' },
      cart:     { sel: '#cartCount', kind: 'cart', label: 'Compteur du panier' },
      buttons:  { sel: '.btn-primary, .btn-secondary', kind: 'press', label: 'Boutons' },
      nav:      { sel: '.nav-link', kind: 'nav', label: 'Liens du menu' }
    }
  };
  function flip(container, mutate, o){
    o = norm(o); const snap = new Map(); [...container.children].forEach(e => { const k = e.dataset && (e.dataset.id || e.dataset.key); if(k) snap.set(k, { x: e.offsetLeft, y: e.offsetTop }); });
    mutate(); if(RM()) return;
    [...container.children].forEach(e => { const k = e.dataset && (e.dataset.id || e.dataset.key), s0 = k && snap.get(k); if(s0){ const dx = s0.x - e.offsetLeft, dy = s0.y - e.offsetTop; if(Math.abs(dx) + Math.abs(dy) > 2) A(e, [{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], o); } });
  }
  root.SLX_MOTION = { TARGETS, flip, BEHAVIORS: B, EASES, DIRS, run, install, uninstall, themeWipe, norm, supported: () => !RM() };
})(typeof window !== 'undefined' ? window : globalThis);
