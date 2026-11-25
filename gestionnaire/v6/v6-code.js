/* SEN LUXE v6.2 — Studio « code » : éditeur Motion Script, bibliothèque complète (individuelles, composants, sections,
 * transitions de page, globales, univers), interrupteur général Motion Design, aperçus multi-zones. */
(function(){
  'use strict';
  var V6 = window.V6, SC = window.SLX_SCRIPT, M = window.SLX_MOTION, U = window.SLX_UNIVERSES; if(!V6 || !SC || !U) return;
  var h = V6.h, q = function(s, r){ return (r || document).querySelector(s); }, cl = function(o){ return JSON.parse(JSON.stringify(o)); };
  var SEGS = [['single', 'Individuelles'], ['component', 'Composants'], ['section', 'Sections'], ['transition', 'Transitions de page'], ['global', 'Globales'], ['univers', 'Univers complets'], ['mine', 'Mes créations (code)']];
  V6.LB = { seg: 'univers' };
  function nowIso(){ return new Date().toISOString(); }
  function rid(p){ return p + Math.random().toString(36).slice(2, 8); }

  /* ================= scène d'aperçu (mini-site avec les mêmes classes que le vrai site) ================= */
  var IMG = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 60"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d4af37"/><stop offset="1" stop-color="#8a6a2f"/></linearGradient></defs><rect width="80" height="60" fill="url(#g)"/><circle cx="40" cy="30" r="12" fill="none" stroke="#fff" stroke-width="3"/></svg>');
  function stageHtml(){
    var card = function(n, b){ return '<div class="product-card"><div class="product-media"><img alt="" src="' + IMG + '">' + (b ? '<span class="badge">Promo</span>' : '') + '</div><div class="product-name">Bague ' + n + '</div><div class="product-price">' + (n * 3500 + 5000).toLocaleString('fr-FR') + ' FCFA</div></div>'; };
    return '<div class="v6-stage" aria-hidden="true"><div id="siteHeader"><span class="logo"><span class="logo-word"><i>SEN</i><b>LUXE</b></span></span><span><a class="nav-link">Bijoux</a><a class="nav-link">Collections</a><a class="nav-link">Contact</a></span><span class="cat-pill">Bagues</span><span class="stg-cart">Panier <em id="cartCount">2</em></span></div>' +
      '<section class="hero"><div class="hero-media"></div><div class="hero-inner"><span class="eyebrow">Joaillerie</span><h1>L\'éclat à Dakar</h1><p>Or et pierres, façonnés avec soin.</p><a class="btn-primary">Découvrir</a></div></section>' +
      '<section class="collections"><div class="stg-grid">' + card(1, true) + card(2) + card(3) + '</div></section><footer><div class="footer-top"><div>Boutique</div><div>Aide</div><div>Suivez-nous</div></div><div class="footer-bottom">© SEN LUXE</div></footer><div class="cart-drawer"><div class="cart-item">1 × Bague</div></div></div>';
  }
  function zoneEls(stage, zone){ var z = SC.ZONES.public[zone]; if(!z) return []; try{ return [].slice.call(stage.querySelectorAll(z[0])).slice(0, 14); }catch(e){ return []; } }
  var EAS = SC.EASES;
  function stageStop(stage){ (stage.__an || []).forEach(function(a){ try{ a.cancel(); }catch(e){} }); stage.__an = []; (stage.__ov || []).forEach(function(n){ n.remove(); }); stage.__ov = []; clearTimeout(stage.__t); }
  /* joue des specs (et des comportements du moteur) sur la scène — une seule fois, déclencheurs simulés */
  V6.stagePlay = function(stage, specs, motion){
    if(!stage) return; stageStop(stage); var any = false;
    (specs || []).forEach(function(raw){
      var v = SC.validate(raw, 'public'); if(!v.ok) return; var s = v.spec, d = s.duration * 1000, ease = EAS[s.ease] || s.ease;
      if(s.target === 'page'){ var ov = document.createElement('div'); ov.className = 'v6-ov'; ov.style.cssText = 'position:absolute;inset:0;z-index:20;pointer-events:none;background:' + s.color; stage.appendChild(ov); stage.__ov.push(ov);
        var V = s.variant, hide = V === 'iris' ? 'circle(0% at 50% 50%)' : V === 'wipe' ? 'inset(0 0 0 100%)' : 'inset(100% 0 0 0)', show = V === 'iris' ? 'circle(150% at 50% 50%)' : 'inset(0 0 0 0)', out = V === 'iris' ? 'circle(0% at 50% 50%)' : V === 'wipe' ? 'inset(0 100% 0 0)' : 'inset(0 0 100% 0)';
        var kf = V === 'fade' ? [{ opacity: 0 }, { opacity: 1, offset: .35 }, { opacity: 0 }] : [{ clipPath: hide }, { clipPath: show, offset: .4 }, { clipPath: out }];
        var a = ov.animate(kf, { duration: d * 1.6, easing: ease, fill: 'both' }); a.onfinish = function(){ ov.style.display = 'none'; }; stage.__an.push(a); any = true; return; }
      var els = s.target === 'selector' ? [] : zoneEls(stage, s.target); if(!els.length) return;
      els.forEach(function(e, n){ var kf = SC.compile(s), o = { duration: s.trigger === 'scroll' ? 1600 : d, delay: (s.trigger === 'load' || s.trigger === 'enter' ? s.delay + n * s.stagger : 0) * 1000, easing: s.trigger === 'scroll' ? 'linear' : ease, fill: 'both', iterations: s.iterations, direction: s.trigger === 'hover' || s.trigger === 'scroll' ? 'alternate' : s.direction };
        if(s.trigger === 'hover' || s.trigger === 'scroll') o.iterations = 2; if(s.trigger === 'click') o.delay = 700 + n * s.stagger * 1000; var a2 = e.animate(kf, o); stage.__an.push(a2); any = true; });
    });
    if(motion && M){ var cfgs = cl(motion); Object.keys(cfgs).forEach(function(k){ var c = cfgs[k], T = M.TARGETS.public[k], b = c && M.BEHAVIORS[c.b]; if(!T || !b || c.on === false) return;
      var els = [].slice.call(stage.querySelectorAll(T.sel)).slice(0, 8); if(!els.length) return;
      try{ if(b.kind === 'list') M.run(c.b, els, c, { force: true }); else els.forEach(function(e, i){ if(b.kind === 'cart'){ e.textContent = String(+e.textContent + 1); } M.run(c.b, e, Object.assign({}, c, { delay: (c.delay || 0) + i * .05 }), { force: true, from: 0, ratio: 0 }); }); any = true; }catch(x){} }); }
    return any;
  };
  var _vis = 'IntersectionObserver' in window ? new IntersectionObserver(function(es){ es.forEach(function(en){ if(en.isIntersecting && !en.target.__played){ en.target.__played = 1; var p = en.target.__play; if(p && SC.supported()) p(); } }); }, { threshold: .5 }) : null;
  function stageFor(fn){ return '<div class="v6-stagew">' + stageHtml() + '</div>'; }

  /* ================= bibliothèque ================= */
  function itemsFor(seg){
    if(seg === 'single') return U.SINGLES.map(function(x){ return { id: x.id, name: x.name, desc: x.desc, specs: [x.spec], scope: 'single' }; });
    if(seg === 'univers') return U.UNIVERSES.map(function(x){ return { id: x.id, name: x.name, desc: x.desc, specs: x.scripts, motion: x.motion, scope: 'univers', tags: x.tags }; });
    return U.PACKS.filter(function(p){ return p.scope === seg; }).map(function(p){ return { id: p.id, name: p.name, desc: p.desc, specs: p.scripts, scope: p.scope }; });
  }
  var REG = {};
  function libCards(seg){
    if(seg === 'mine') return mineHtml();
    var items = itemsFor(seg); items.forEach(function(it){ REG[it.id] = it; });
    return '<div class="v6-mgrid">' + items.map(function(it){
      var act = (D().motionMaster || {}).universe === it.id;
      return '<div class="v6-mcard" data-id="' + h(it.id) + '"><div class="v6-mdemo v6-mstage">' + stageFor() + '</div><div class="v6-mmeta"><span class="v6-badge ' + (act ? 'ok' : '') + '">' + (act ? 'Actif (brouillon)' : h((SEGS.find(function(s){ return s[0] === seg; }) || [])[1] || '')) + '</span><b>' + h(it.name) + '</b><p>' + h(it.desc) + '</p><small class="muted">' + it.specs.length + ' animation(s)' + (it.motion ? ' + ' + Object.keys(it.motion).length + ' comportements' : '') + '</small></div>' +
        '<div class="v6-lact"><button type="button" class="btn ghost" data-act="v6CPlay" data-arg="' + h(it.id) + '">▶ Rejouer</button><button type="button" class="btn ghost" data-act="v6CSite" data-arg="' + h(it.id) + '">Voir sur le site</button><button type="button" class="btn ghost" data-act="v6CCode" data-arg="' + h(it.id) + '">Voir / modifier le code</button>' + (seg === 'univers' ? '<button type="button" class="btn dark" data-act="v6UniPick" data-arg="' + h(it.id) + '">Activer (brouillon)</button>' : '<button type="button" class="btn dark" data-act="v6CAdd" data-arg="' + h(it.id) + '">Ajouter au site (brouillon)</button>') + '</div></div>'; }).join('') + '</div>';
  }
  function mineHtml(){
    var L = V6.cfg.v6_scripts || [];
    return '<div class="v6-row"><button type="button" class="btn dark" data-act="v6CNew">+ Nouvelle animation en code</button><button type="button" class="btn ghost" data-act="v6CExport">Exporter (JSON)</button></div>' +
      (L.length ? '<div class="v6-lgrid">' + L.map(function(x){ var v = SC.validate(x.code, x.scope); return '<div class="v6-lcard"><div class="v6-lmeta"><b>' + h(x.name) + '</b><small>' + (v.ok ? '✓ valide' : '✕ à corriger') + ' · ' + h(x.scope === 'manager' ? 'gestionnaire' : 'site') + ' · ' + h(new Date(x.updated || x.created).toLocaleDateString('fr-FR')) + '</small></div><div class="v6-lact"><button type="button" class="btn" data-act="v6CEdit" data-arg="' + h(x.id) + '">Modifier</button><button type="button" class="btn ghost" data-act="v6CDup" data-arg="' + h(x.id) + '">Dupliquer</button><button type="button" class="btn ghost danger" data-act="v6CDel" data-arg="' + h(x.id) + '">Supprimer</button></div></div>'; }).join('') + '</div>' : '<p class="muted">Aucune création pour l\'instant. Écrivez votre première animation avec « Nouvelle animation en code » : elle sera enregistrée ici et modifiable à tout moment.</p>');
  }
  var oldBody = V6.studioBody;
  V6.studioBody = function(tab){
    var html = oldBody(tab);
    if(tab === 'site') return masterPanel() + html;
    if(tab !== 'library') return html;
    var seg = V6.LB.seg, nav = '<div class="v6-cats v6-segs">' + SEGS.map(function(s){ return '<button type="button" class="' + (seg === s[0] ? 'on' : '') + '" data-act="v6CSeg" data-arg="' + s[0] + '">' + s[1] + '</button>'; }).join('') + '</div>';
    var intro = '<div class="v6-sub"><b>Bibliothèque de motion design.</b> Les 14 comportements interactifs sont conservés (onglet « Individuelles »). Chaque ensemble se prévisualise sur une mini-vitrine puis sur plusieurs parties du vrai site avant activation. Rien n\'est publié sans votre confirmation.</div>';
    if(seg === 'single') return intro + nav + '<h3 class="se-h">Animations en code prêtes à l\'emploi</h3>' + libCards('single') + '<h3 class="se-h">Comportements interactifs (14)</h3>' + html;
    return intro + nav + libCards(seg);
  };
  var oldAfter = V6.afterRender;
  V6.afterRender = function(view, tab){
    if(oldAfter) oldAfter(view, tab);
    if(view !== 'studio' || tab !== 'library') return;
    document.querySelectorAll('.v6-mcard[data-id]').forEach(function(c){ var it = REG[c.dataset.id]; if(!it) return; c.__play = function(){ V6.stagePlay(q('.v6-stage', c), it.specs, it.motion); }; if(_vis) _vis.observe(c); });
  };

  /* ================= interrupteur général + univers + créations (brouillon du site) ================= */
  function MM(){ var d = D(); return d.motionMaster || { on: true, universe: '', mute: [] }; }
  function setMM(fn){ var d = D(); var m = Object.assign({ on: true, universe: '', mute: [] }, d.motionMaster || {}); fn(m); d.motionMaster = m; return commitMotion(); }
  async function commitMotion(){ await persist(); refreshChrome(); if(typeof apSendSoon === 'function') apSendSoon(); V6.rerender(); }
  function masterPanel(){
    var m = MM(), u = U.UNIVERSES.find(function(x){ return x.id === m.universe; }), pubM = S.published.motionMaster, pubOn = !(pubM && pubM.on === false) && !!(pubM && pubM.universe || S.published.motion && Object.keys(S.published.motion).length || (S.published.motionScripts || []).length);
    var layers = u ? u.scripts.map(function(s){ var off = (m.mute || []).indexOf(s.name) >= 0; return '<div class="v6-layer"><label class="v6-switch"><input type="checkbox" data-act="v6LayerToggle" data-arg="' + h(s.name) + '"' + (off ? '' : ' checked') + '> ' + h(s.name) + '</label><small>' + h(SC.ZONES.public[s.target] ? SC.ZONES.public[s.target][1] : s.target === 'page' ? 'Transition de page' : s.target) + ' · ' + h({ load: 'au chargement', enter: 'à l\'entrée', hover: 'au survol', click: 'au clic', scroll: 'au défilement' }[s.trigger]) + '</small><button type="button" class="btn ghost" data-act="v6LayerCopy" data-arg="' + h(s.name) + '">Personnaliser en code</button></div>'; }).join('') : '';
    var mine = (D().motionScripts || []).map(function(w, i){ return '<div class="v6-layer"><label class="v6-switch"><input type="checkbox" data-act="v6UsToggle" data-arg="' + i + '"' + (w.on !== false ? ' checked' : '') + '> ' + h(w.name) + '</label><small>' + h(w.spec && SC.ZONES.public[w.spec.target] ? SC.ZONES.public[w.spec.target][1] : (w.spec && w.spec.target) || '') + '</small><button type="button" class="btn ghost" data-act="v6UsEdit" data-arg="' + i + '">Modifier le code</button><button type="button" class="btn ghost danger" data-act="v6UsDel" data-arg="' + i + '">Retirer</button></div>'; }).join('');
    return '<div class="v6-master ' + (m.on ? 'on' : 'off') + '"><div class="v6-master-h"><div><h3 class="se-h" style="margin:0">Motion Design du site</h3><p class="hint" style="margin:4px 0 0">' + (m.on ? 'Activé : le site utilise l\'univers et les animations ci-dessous.' : 'Désactivé : le site garde exactement son apparence actuelle, sans aucune animation supplémentaire.') + '</p></div>' +
      '<label class="v6-switch v6-bigsw"><input type="checkbox" data-act="v6MasterToggle"' + (m.on ? ' checked' : '') + ' aria-label="Motion Design activé"> ' + (m.on ? 'Activé' : 'Désactivé') + '</label></div>' +
      '<div class="v6-row"><span class="v6-badge ' + (u ? 'ok' : '') + '">Univers : ' + h(u ? u.name : 'aucun') + '</span><span class="v6-badge">' + (pubOn ? 'Site publié : motion actif' : 'Site publié : sans motion supplémentaire') + '</span><button type="button" class="btn ghost" data-act="v6Goto" data-arg="univers">Choisir un univers</button><button type="button" class="btn ghost" data-act="v6CNew">Écrire une animation</button>' + (pubOn ? '<button type="button" class="btn ghost danger" data-act="v6MasterOffNow">Désactiver sur le site publié maintenant</button>' : '') + '</div>' +
      (layers ? '<h4 class="v6-h4">Animations de l\'univers « ' + h(u.name) + ' » (activer / désactiver individuellement)</h4>' + layers : '') + (mine ? '<h4 class="v6-h4">Mes animations en code</h4>' + mine : '') +
      '<p class="hint">Vos changements sont un <b>brouillon</b> (aperçu instantané ci-dessous). Ils ne sont visibles des visiteurs qu\'après « Publier ».</p></div>';
  }
  var A = ACT_EXTRA;
  Object.assign(A, {
    v6CSeg: function(a){ V6.LB.seg = a; V6.rerender(); },
    v6Goto: function(a){ V6.LB.seg = a; V6.tab.studio = 'library'; V6.rerender(); },
    v6CPlay: function(a){ var c = q('.v6-mcard[data-id="' + a + '"]'), it = REG[a]; if(c && it) V6.stagePlay(q('.v6-stage', c), it.specs, it.motion); },
    v6CSite: function(a){ siteModal(REG[a]); },
    v6CCode: function(a){ var it = REG[a]; if(!it) return; var s = it.specs.length === 1 ? it.specs[0] : it.specs[0]; codeEditor({ code: pretty(s), name: s.name, title: 'Code de « ' + it.name + ' » (copie modifiable)', fresh: true }); },
    v6CAdd: async function(a){ var it = REG[a]; if(!it) return; var d = D(); d.motionScripts = (d.motionScripts || []).filter(function(w){ return w.src !== a; }); it.specs.forEach(function(s, i){ d.motionScripts.push({ id: rid('w'), src: a, on: true, name: s.name || it.name, spec: cl(s) }); }); d.motionScripts = d.motionScripts.slice(0, 30); if(!d.motionMaster) d.motionMaster = { on: true, universe: '', mute: [] }; d.motionMaster.on = true; toast('« ' + it.name + ' » ajouté au brouillon du site (non publié).'); await commitMotion(); },
    v6UniPick: async function(a){ await setMM(function(m){ m.universe = a; m.on = true; m.mute = []; }); toast('Univers activé dans le brouillon : aperçu en direct dans SITE WEB. Rien n\'est publié.'); },
    v6MasterToggle: function(a, el){ var on = el ? el.checked : !MM().on; setMM(function(m){ m.on = on; }); },
    v6LayerToggle: function(a, el){ setMM(function(m){ m.mute = (m.mute || []).filter(function(x){ return x !== a; }); if(el && !el.checked) m.mute.push(a); }); },
    v6LayerCopy: function(a){ var u = U.UNIVERSES.find(function(x){ return x.id === MM().universe; }), s = u && u.scripts.find(function(x){ return x.name === a; }); if(!s) return; codeEditor({ code: pretty(s), name: s.name, title: 'Personnaliser « ' + a + ' »', muteOf: a, fresh: true }); },
    v6UsToggle: function(a, el){ var w = (D().motionScripts || [])[+a]; if(w){ w.on = el ? el.checked : w.on === false; commitMotion(); } },
    v6UsEdit: function(a){ var w = (D().motionScripts || [])[+a]; if(w) codeEditor({ code: pretty(w.spec), name: w.name, title: 'Modifier « ' + w.name + ' »', wid: w.id }); },
    v6UsDel: async function(a){ var d = D(); d.motionScripts.splice(+a, 1); if(!d.motionScripts.length) delete d.motionScripts; await commitMotion(); },
    v6MasterOffNow: async function(){
      if(!await confirmDlg('Désactiver le Motion Design du site publié', 'Le site public reviendra immédiatement à son apparence sans animation supplémentaire. Vos univers et créations restent dans le brouillon. Seul ce réglage est publié.', 'Désactiver maintenant', 'dark')) return;
      await setMM(function(m){ m.on = false; }); await publishPart(function(p){ p.motionMaster = Object.assign({}, cl(D().motionMaster)); }, 'Motion Design désactivé sur le site publié'); V6.rerender();
    },
    v6CNew: function(){ codeEditor({ code: TEMPLATES.montee, title: 'Nouvelle animation en code' }); },
    v6CEdit: function(a){ var x = (V6.cfg.v6_scripts || []).find(function(i){ return i.id === a; }); if(x) codeEditor({ code: x.code, name: x.name, lid: x.id, scope: x.scope, title: 'Modifier « ' + x.name + ' »' }); },
    v6CDup: async function(a){ var L = cl(V6.cfg.v6_scripts || []), x = L.find(function(i){ return i.id === a; }); if(!x) return; if(L.length >= 60) return toast('60 créations maximum.', 'err'); L.push(Object.assign({}, x, { id: rid('s-'), name: x.name + ' (copie)', created: nowIso(), updated: nowIso() })); await V6.save('v6_scripts', L); V6.rerender(); },
    v6CDel: async function(a){ if(!await confirmDlg('Supprimer la création', 'Supprimer cette animation de votre bibliothèque ? (Les copies déjà ajoutées au brouillon du site restent.)', 'Supprimer', 'danger')) return; await V6.save('v6_scripts', (V6.cfg.v6_scripts || []).filter(function(i){ return i.id !== a; })); V6.rerender(); },
    v6CExport: function(){ var b = new Blob([JSON.stringify({ version: 1, v6_scripts: V6.cfg.v6_scripts || [] }, null, 1)], { type: 'application/json' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'senluxe-animations-code.json'; a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); }, 2000); }
  });
  document.addEventListener('change', function(e){ var t = e.target, a = t.dataset && t.dataset.act; if(a === 'v6MasterToggle' || a === 'v6LayerToggle' || a === 'v6UsToggle'){ e.stopPropagation(); } }, true);

  /* ================= aperçu sur le vrai site (plusieurs parties) ================= */
  function siteModal(it, custom){
    if(typeof previewHtml !== 'function') return toast('Aperçu indisponible.', 'err');
    var url = URL.createObjectURL(new Blob([previewHtml(S.draft)], { type: 'text/html;charset=utf-8' }));
    var PARTS = [['Accueil et en-tête', '#top'], ['Produits et cartes', '#products'], ['Pied de page', 'footer']];
    var m = openModal({ size: 'lg', title: 'Aperçu sur le site : ' + (it ? it.name : 'ma création'), body: '<p class="hint" style="margin-top:0">Brouillon actuel du site avec cette animation seule. Rien n\'est enregistré ni publié.</p><div class="v6-frames">' + PARTS.map(function(p, i){ return '<div><b>' + h(p[0]) + '</b><iframe class="v6-fr" title="' + h(p[0]) + '" data-i="' + i + '"></iframe></div>'; }).join('') + '</div>', foot: '<button type="button" class="btn ghost" id="v6f-r">▶ Rejouer</button><button type="button" class="btn ghost" data-close>Fermer</button>' , onClose: function(){ URL.revokeObjectURL(url); } });
    var frs = [].slice.call(m.wrap.querySelectorAll('iframe'));
    var payload = function(on){ var p = publicPayload(S.draft); p.motion = {}; delete p.motionScripts; p.motionMaster = { on: on, universe: it && it.scope === 'univers' ? it.id : '' }; if(it && it.scope !== 'univers') p.motionScripts = it.specs.map(function(s){ return { on: true, spec: s }; }); p.motionMaster.on = on; return p; };
    var send = function(fr, on){ try{ fr.contentWindow.postMessage({ type: 'senluxe-preview', payload: payload(on) }, '*'); }catch(e){} };
    frs.forEach(function(fr, i){ fr.style.cssText = 'width:100%;height:340px;border:1px solid var(--line);background:#fff'; fr.src = url;
      var tries = 0, tm = setInterval(function(){ tries++; var w = fr.contentWindow; if(!w || tries > 80 || !document.body.contains(fr)){ clearInterval(tm); return; }
        try{ if(typeof w.slxV6Apply !== 'function' || w.document.readyState === 'loading') return; var el = PARTS[i][1] === '#top' ? null : w.document.querySelector(PARTS[i][1]); if(PARTS[i][1] !== '#top' && !el) return; clearInterval(tm); w.scrollTo(0, el ? el.getBoundingClientRect().top + w.scrollY - 60 : 0); setTimeout(function(){ send(fr, true); }, 250); }catch(e){} }, 250); });
    q('#v6f-r', m.wrap).onclick = function(){ frs.forEach(function(fr){ send(fr, false); setTimeout(function(){ send(fr, true); }, 250); }); };
  }
  V6.siteModal = siteModal;

  /* ================= éditeur de code ================= */
  var TEMPLATES = {
    montee: '{\n  // Nom affiché dans la bibliothèque\n  "name": "Montée en fondu",\n  // Zone du site : logo, header, nav, menus, hero, banners, sections, backgrounds,\n  // images, cards, prices, badges, buttons, cart, cartcount, modal, footer, page, selector\n  "target": "cards",\n  // load | enter (à l\'entrée à l\'écran) | hover | click | scroll\n  "trigger": "enter",\n  "duration": 0.7,\n  "delay": 0,\n  "stagger": 0.07,\n  "ease": "smooth",\n  "intensity": 1,\n  "from": { "opacity": 0, "y": 30, "scale": 0.96 },\n  "to": {}\n}'
  };
  var SNIPS = { 'Montée en fondu': TEMPLATES.montee, 'Masque de révélation': '{\n  "name": "Masque de révélation",\n  "target": "images",\n  "trigger": "enter",\n  "duration": 1,\n  "stagger": 0.08,\n  "ease": "smooth",\n  "from": { "clip": "inset(100% 0% 0% 0%)", "scale": 1.12 },\n  "to": { "clip": "inset(0% 0% 0% 0%)", "scale": 1 }\n}', 'Survol soulevé': '{\n  "name": "Survol soulevé",\n  "target": "cards",\n  "trigger": "hover",\n  "duration": 0.3,\n  "from": {},\n  "to": { "y": -8, "scale": 1.02 }\n}', 'Parallaxe au défilement': '{\n  "name": "Parallaxe",\n  "target": "images",\n  "trigger": "scroll",\n  "ease": "linear",\n  "from": { "y": -20 },\n  "to": { "y": 20 }\n}', 'Images-clés multiples': '{\n  "name": "Pulsation",\n  "target": "badges",\n  "trigger": "load",\n  "duration": 1.2,\n  "iterations": 3,\n  "keyframes": [\n    { "offset": 0, "scale": 1 },\n    { "offset": 0.5, "scale": 1.25, "rotate": 6 },\n    { "offset": 1, "scale": 1 }\n  ]\n}', 'Transition de page': '{\n  "name": "Rideau de page",\n  "target": "page",\n  "trigger": "load",\n  "variant": "curtain",\n  "color": "#0a0a0a",\n  "duration": 1,\n  "ease": "snap"\n}', 'Sélecteur libre': '{\n  "name": "Titres de section",\n  "target": "selector",\n  "selector": ".section-head h2",\n  "trigger": "enter",\n  "from": { "x": -30, "opacity": 0 },\n  "to": {}\n}' };
  function pretty(o){ var c = cl(o); return JSON.stringify(c, null, 2); }
  function codeEditor(o){
    var scope = o.scope || 'public', text = o.code || TEMPLATES.montee, st = { lid: o.lid || null, wid: o.wid || null, muteOf: o.muteOf || null };
    var snip = '<option value="">Insérer un modèle…</option>' + Object.keys(SNIPS).map(function(k){ return '<option>' + h(k) + '</option>'; }).join('');
    var m = openModal({ size: 'lg', title: o.title || 'Éditeur d\'animation', body:
      '<div class="v6-ed"><div class="v6-ed-l"><div class="v6-row"><select id="v6c-sn" aria-label="Modèles">' + snip + '</select><select id="v6c-sc" aria-label="Destination du code"><option value="public"' + (scope === 'public' ? ' selected' : '') + '>Pour le site public</option><option value="manager"' + (scope === 'manager' ? ' selected' : '') + '>Pour le gestionnaire</option></select><button type="button" class="btn ghost" id="v6c-fm">Mettre en forme</button></div>' +
      '<div class="v6-code"><pre class="v6-gut" aria-hidden="true"></pre><textarea id="v6c-t" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="Code d\'animation" wrap="off"></textarea></div><div id="v6c-msg" class="v6-msg" role="status" aria-live="polite"></div>' +
      '<details class="v6-help"><summary>Aide : langage Motion Script</summary><div class="hint">Le code est du <b>JSON</b> (commentaires <code>//</code> autorisés), jamais du JavaScript. <b>from</b> / <b>to</b> ou <b>keyframes</b> acceptent : opacity, x, y, scale, scaleX, scaleY, rotate, skewX, skewY, blur, brightness, saturate, clip (inset/circle en %). Réglages : duration, delay, stagger, ease (smooth, spring, snap, soft, linear ou cubic-bezier), iterations, direction, intensity, origin, limit. Tout ce qui n\'est pas dans cette liste est refusé.</div></details></div>' +
      '<div class="v6-ed-r"><div class="v6-stagew big">' + stageHtml() + '</div><div class="v6-row"><button type="button" class="btn dark" id="v6c-play">▶ Rejouer</button><button type="button" class="btn ghost" id="v6c-site">Aperçu sur le site (3 parties)</button></div><div class="v6-mctl" id="v6c-ctl"></div></div></div>',
      foot: '<button type="button" class="btn ghost" data-close>Fermer</button><button type="button" class="btn" id="v6c-save">Enregistrer dans la bibliothèque</button><button type="button" class="btn gold" id="v6c-site-add">Ajouter au brouillon du site</button><button type="button" class="btn ghost" id="v6c-mgr-add">Appliquer au gestionnaire</button>' });
    m.wrap.querySelector('.modal').classList.add('v6-xl');
    var w = m.wrap, g = function(i){ return q(i, w); }, ta = g('#v6c-t'), gut = q('.v6-gut', w), stage = q('.v6-stage', w), msg = g('#v6c-msg'), cur = null, t1, t2;
    ta.value = text;
    function lines(){ var n = ta.value.split('\n').length, s = ''; for(var i = 1; i <= n; i++) s += i + '\n'; gut.textContent = s; gut.scrollTop = ta.scrollTop; }
    function check(autoplay){
      var sc = g('#v6c-sc').value, v = SC.validate(ta.value, sc); cur = v.ok ? v.spec : null;
      msg.className = 'v6-msg ' + (v.ok ? 'ok' : 'err'); msg.innerHTML = v.ok ? '✓ Code valide et sûr — ' + h(v.spec.name) : '✕ ' + v.errors.slice(0, 4).map(h).join('<br>✕ ');
      ['v6c-save', 'v6c-site-add', 'v6c-mgr-add', 'v6c-site', 'v6c-play'].forEach(function(id){ var b = g('#' + id); if(b) b.disabled = !v.ok; });
      if(v.ok){ controls(); if(autoplay) play(); }
    }
    function play(){ if(!cur || g('#v6c-sc').value !== 'public'){ if(cur && stage){ V6.stagePlay(stage, [], null); toast('Aperçu de la vitrine : les zones du gestionnaire se testent sur la page elle-même.'); } return; } V6.stagePlay(stage, [cur], null); }
    function setField(k, v){ var p = SC.parse(ta.value); if(!p.ok || !p.v || typeof p.v !== 'object') return; p.v[k] = v; ta.value = JSON.stringify(p.v, null, 2); lines(); check(true); }
    function controls(){
      var s = cur, z = Object.keys(SC.ZONES[g('#v6c-sc').value]).concat(g('#v6c-sc').value === 'public' ? ['page'] : [], ['selector']);
      var sl = function(k, lbl, a, b, st, u){ return '<div class="field"><label>' + lbl + ' : <b>' + h(s[k]) + u + '</b></label><input type="range" min="' + a + '" max="' + b + '" step="' + st + '" value="' + h(s[k]) + '" data-v6k="' + k + '"></div>'; };
      var se = function(k, lbl, arr){ return '<div class="field"><label>' + lbl + '</label><select data-v6k="' + k + '">' + arr.map(function(x){ return '<option' + (s[k] === x ? ' selected' : '') + '>' + h(x) + '</option>'; }).join('') + '</select></div>'; };
      var box = g('#v6c-ctl'); if(box.contains(document.activeElement) && document.activeElement.type === 'range') return;
      box.innerHTML = se('target', 'Zone', z) + se('trigger', 'Déclencheur', SC.TRIGGERS) + sl('duration', 'Durée', .05, 4, .05, ' s') + sl('delay', 'Retard', 0, 3, .05, ' s') + sl('stagger', 'Décalage', 0, .3, .01, ' s') + sl('intensity', 'Intensité', .2, 2, .1, '') + se('ease', 'Courbe', Object.keys(SC.EASES).filter(function(x){ return ['smooth', 'spring', 'snap', 'soft', 'linear'].indexOf(x) >= 0; }));
    }
    ta.addEventListener('input', function(){ lines(); clearTimeout(t1); t1 = setTimeout(function(){ check(true); }, 350); });
    ta.addEventListener('scroll', function(){ gut.scrollTop = ta.scrollTop; });
    ta.addEventListener('keydown', function(e){ if(e.key === 'Tab'){ e.preventDefault(); var s = ta.selectionStart; ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(ta.selectionEnd); ta.selectionStart = ta.selectionEnd = s + 2; ta.dispatchEvent(new Event('input')); } });
    w.addEventListener('input', function(e){ var k = e.target.dataset && e.target.dataset.v6k; if(k && e.target.type === 'range'){ var v = Number(e.target.value), lb = e.target.parentNode.querySelector('b'); if(lb) lb.textContent = v; clearTimeout(t2); t2 = setTimeout(function(){ setField(k, v); }, 250); } });
    w.addEventListener('change', function(e){ var k = e.target.dataset && e.target.dataset.v6k; if(k && e.target.tagName === 'SELECT'){ var v = e.target.value; if(k === 'target' && v === 'selector'){ var p = SC.parse(ta.value); if(p.ok && !p.v.selector){ p.v.selector = '.product-card'; ta.value = JSON.stringify(p.v, null, 2); } } setField(k, v); } });
    g('#v6c-sn').onchange = function(){ var v = SNIPS[this.value]; if(v){ ta.value = v; lines(); check(true); } this.value = ''; };
    g('#v6c-sc').onchange = function(){ check(true); };
    g('#v6c-fm').onclick = function(){ var p = SC.parse(ta.value); if(!p.ok) return toast('Corrigez le code avant la mise en forme.', 'err'); ta.value = JSON.stringify(p.v, null, 2); lines(); check(false); };
    g('#v6c-play').onclick = play;
    g('#v6c-site').onclick = function(){ if(cur) siteModal({ name: cur.name, scope: 'single', specs: [cur] }); };
    g('#v6c-save').onclick = async function(){
      if(!cur) return; var L = cl(V6.cfg.v6_scripts || []), sc = g('#v6c-sc').value, code = ta.value.slice(0, 6000);
      var ex = st.lid ? L.find(function(x){ return x.id === st.lid; }) : null;
      if(ex){ ex.name = cur.name; ex.code = code; ex.scope = sc; ex.updated = nowIso(); } else { if(L.length >= 60) return toast('60 créations maximum.', 'err'); st.lid = rid('s-'); L.push({ id: st.lid, name: cur.name, code: code, scope: sc, created: nowIso(), updated: nowIso() }); }
      var r = await V6.save('v6_scripts', L); toast(r.ok ? 'Enregistré dans la bibliothèque (Mes créations).' : 'Enregistré sur cet appareil ; erreur serveur : ' + h(r.error), r.ok ? '' : 'err'); V6.rerender();
    };
    g('#v6c-site-add').onclick = async function(){
      if(!cur) return; if(g('#v6c-sc').value !== 'public') return toast('Ce code est destiné au gestionnaire : choisissez « Pour le site public ».', 'err');
      var d = D(); d.motionScripts = d.motionScripts || [];
      var ex = st.wid ? d.motionScripts.find(function(x){ return x.id === st.wid; }) : null;
      if(ex){ ex.spec = cl(cur); ex.name = cur.name; } else { if(d.motionScripts.length >= 30) return toast('30 animations maximum sur le site.', 'err'); st.wid = rid('w'); d.motionScripts.push({ id: st.wid, on: true, name: cur.name, spec: cl(cur), lib: st.lid || undefined }); }
      d.motionMaster = Object.assign({ on: true, universe: '', mute: [] }, d.motionMaster || {}); d.motionMaster.on = true;
      if(st.muteOf){ d.motionMaster.mute = (d.motionMaster.mute || []).concat(st.muteOf).filter(function(x, i, a){ return a.indexOf(x) === i; }); st.muteOf = null; }
      await commitMotion(); toast('Ajouté au brouillon du site (non publié). Aperçu instantané dans SITE WEB.');
    };
    g('#v6c-mgr-add').onclick = async function(){
      if(!cur) return; if(g('#v6c-sc').value !== 'manager') return toast('Choisissez « Pour le gestionnaire » (zones du gestionnaire) pour l\'appliquer ici.', 'err');
      var an = cl(V6.cfg.mgr_anim); an.scripts = (an.scripts || []).filter(function(x){ return x.name !== cur.name; }); an.scripts.push(cl(cur)); an.scripts = an.scripts.slice(0, 20); var r = await V6.save('mgr_anim', an); toast(r.ok ? 'Appliqué au gestionnaire.' : 'Appliqué sur cet appareil ; erreur serveur : ' + h(r.error), r.ok ? '' : 'err'); V6.applyMotion();
    };
    lines(); check(true);
  }
  V6.codeEditor = codeEditor;
})();
