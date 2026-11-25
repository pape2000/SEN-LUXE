/* SEN LUXE v6 — Interface du moteur de mouvement : bibliothèque de comportements (aperçus réels), affectation
 * au gestionnaire et au site public (brouillon, publication explicite), réglages enregistrés. */
(function(){
  'use strict';
  var V6 = window.V6, M = window.SLX_MOTION; if(!V6 || !M) return;
  var h = V6.h, q = function(s, r){ return (r || document).querySelector(s); }, cl = function(o){ return JSON.parse(JSON.stringify(o)); };
  var B = M.BEHAVIORS, nowIso = function(){ return new Date().toISOString(); };
  var CATS = ['Chiffres', 'Indicateurs', 'États', 'Cartes', 'Boutons', 'Notifications', 'Logo', 'Texte', 'Sections', 'Navigation'];
  var TRIG = { load: 'Au chargement', enter: 'À l\'entrée à l\'écran', change: 'À chaque modification', hover: 'Au survol', click: 'Au clic' };
  var DIR = { up: 'Vers le haut', down: 'Vers le bas', left: 'Vers la gauche', right: 'Vers la droite', diagonal: 'En diagonale' };
  var EASE = { smooth: 'Fluide', spring: 'Ressort', snap: 'Net', soft: 'Doux', linear: 'Linéaire' };
  var DEFS = { 'count-up': { dur: 1.1, trig: 'enter' }, 'value-roll': { dur: .45, trig: 'change' }, 'bar-fill': { dur: .9, trig: 'enter' }, 'chart-draw': { dur: 1.1, trig: 'enter', stagger: .08 }, 'select-ring': { dur: .5, trig: 'change' }, 'cards-cascade': { dur: .7, trig: 'enter', stagger: .07, dir: 'up' }, 'list-flip': { dur: .5, trig: 'change', ease: 'spring' }, 'btn-press': { dur: .5, trig: 'click' }, 'toast-spring': { dur: .55, trig: 'load', life: 3500 }, 'logo-build': { dur: .7, trig: 'load', stagger: .06 }, 'text-lines': { dur: .8, trig: 'enter', stagger: .07, dir: 'up' }, 'section-curtain': { dur: .8, trig: 'enter', dir: 'up' }, 'cart-bump': { dur: .5, trig: 'change' }, 'nav-underline': { dur: .35, trig: 'hover' } };
  var PL = { dur: ['Durée', .1, 3, .05, ' s'], speed: ['Vitesse', .5, 2.5, .1, '×'], int: ['Intensité', .2, 2, .1, ''], delay: ['Retard', 0, 2, .05, ' s'], stagger: ['Décalage entre éléments', 0, .3, .01, ' s'], life: ['Durée d\'affichage', 1000, 10000, 250, ' ms'] };
  V6.MS = { cat: '', q: '', open: '', params: {}, legacy: false, mtab: {} };
  function P(id){ var s = V6.MS.params[id]; if(!s){ s = V6.MS.params[id] = Object.assign({ dur: .6, speed: 1, int: 1, delay: 0, stagger: .06, dir: 'up', ease: 'smooth', trig: B[id].trigs[0], life: 3500 }, DEFS[id] || {}); } return s; }
  V6.motionParams = P;
  function entry(id, o){ var e = { b: id, on: true }; ['dur', 'speed', 'int', 'delay', 'stagger', 'dir', 'ease', 'trig', 'life'].forEach(function(k){ if(o[k] !== undefined) e[k] = o[k]; }); return e; }

  /* ===== contrôles de réglage ===== */
  function controls(id, o, scope){
    var b = B[id], rows = '';
    b.params.forEach(function(k){
      if(k === 'dir') rows += '<div class="field"><label>Sens</label><select data-v6m="' + scope + '" data-b="' + id + '" data-k="dir">' + Object.keys(DIR).map(function(d){ return '<option value="' + d + '"' + (o.dir === d ? ' selected' : '') + '>' + DIR[d] + '</option>'; }).join('') + '</select></div>';
      else if(k === 'ease') rows += '<div class="field"><label>Courbe</label><select data-v6m="' + scope + '" data-b="' + id + '" data-k="ease">' + Object.keys(EASE).map(function(d){ return '<option value="' + d + '"' + (o.ease === d ? ' selected' : '') + '>' + EASE[d] + '</option>'; }).join('') + '</select></div>';
      else if(PL[k]){ var p = PL[k]; rows += '<div class="field"><label>' + p[0] + ' : <b>' + h(o[k]) + p[4] + '</b></label><input type="range" min="' + p[1] + '" max="' + p[2] + '" step="' + p[3] + '" value="' + h(o[k]) + '" data-v6m="' + scope + '" data-b="' + id + '" data-k="' + k + '"></div>'; }
    });
    rows += '<div class="field"><label>Déclencheur</label><select data-v6m="' + scope + '" data-b="' + id + '" data-k="trig">' + b.trigs.map(function(t){ return '<option value="' + t + '"' + (o.trig === t ? ' selected' : '') + '>' + TRIG[t] + '</option>'; }).join('') + '</select></div>';
    return '<div class="v6-mctl">' + rows + '</div>';
  }

  /* ===== aperçus réels (mini-interfaces) ===== */
  function demo(id){
    var k = B[id].kind;
    if(k === 'number') return '<div class="v6-dm-num"><b>1 250 000 FCFA</b><small>Chiffre d\'affaires</small></div>';
    if(k === 'bar') return '<div class="v6-dm-bar"><div><i style="width:72%"></i></div><small>Objectif du mois : 72 %</small></div>';
    if(k === 'chart') return '<svg viewBox="0 0 120 56" class="v6-dm-ch"><polyline points="4,46 26,30 48,36 72,14 96,22 116,6" fill="none" stroke="#b8935f" stroke-width="2"/><rect x="10" y="38" width="9" height="14" fill="#d4af37"/><rect x="40" y="28" width="9" height="24" fill="#d4af37"/><rect x="70" y="20" width="9" height="32" fill="#d4af37"/><rect x="100" y="32" width="9" height="20" fill="#d4af37"/></svg>';
    if(k === 'select') return '<div class="v6-dm-chips"><button type="button" class="on" data-chip>Bagues</button><button type="button" data-chip>Colliers</button><button type="button" data-chip>Bracelets</button></div>';
    if(k === 'list') return '<div class="v6-dm-grid">' + [1, 2, 3, 4, 5, 6].map(function(n){ return '<div class="v6-dm-card" data-id="' + n + '"><i></i><span></span></div>'; }).join('') + '</div>' + (id === 'list-flip' ? '<button type="button" class="btn ghost v6-dm-btn" data-act="v6MShuffle">Mélanger</button>' : '');
    if(k === 'press') return '<button type="button" class="btn dark v6-dm-btn" data-act="v6MPress">Ajouter au panier</button>';
    if(k === 'toast') return '<div class="v6-dm-toasts"></div><button type="button" class="btn ghost v6-dm-btn" data-act="v6MToast">Afficher une notification</button>';
    if(k === 'logo') return '<div class="v6-dm-logo"><span class="logo-word"><i>SEN</i><b>LUXE</b></span></div>';
    if(k === 'text') return '<h4 class="v6-dm-h">Maison de joaillerie</h4>';
    if(k === 'section') return '<div class="v6-dm-sec"><b>Nouvelle collection</b><p>Or 18 carats, façonné à Dakar.</p></div>';
    if(k === 'cart') return '<div class="v6-dm-cart"><span class="v6-dm-bag">Panier <em id="v6cc">2</em></span><button type="button" class="btn ghost v6-dm-btn" data-act="v6MCart">+ 1 article</button></div>';
    if(k === 'nav') return '<div class="v6-dm-nav"><a class="v6-dm-a">Collections</a><a class="v6-dm-a">Nouveautés</a></div>';
    return '';
  }
  function target(card, id){ var k = B[id].kind; return k === 'number' ? q('b', card) : k === 'bar' ? q('i', card) : k === 'chart' ? q('svg', card) : k === 'select' ? q('[data-chip].on', card) : k === 'list' ? [].slice.call(card.querySelectorAll('.v6-dm-card')) : k === 'press' ? q('.v6-dm-btn', card) : k === 'logo' ? q('.logo-word', card) : k === 'text' ? q('.v6-dm-h', card) : k === 'section' ? q('.v6-dm-sec', card) : k === 'cart' ? q('#v6cc', card) : null; }
  V6.playDemo = function(id, forced){
    var card = q('.v6-mcard[data-b="' + id + '"]'); if(!card) return; var o = P(id), k = B[id].kind, el = target(card, id); if(!el || (Array.isArray(el) && !el.length)) return;
    var ctx = { force: forced !== false };
    if(k === 'number'){ M.run(id, el, o, Object.assign(ctx, { from: 0 })); }
    else if(k === 'bar'){ M.run(id, el, o, Object.assign(ctx, { ratio: 0 })); }
    else if(id === 'list-flip'){ var g = q('.v6-dm-grid', card); M.flip(g, function(){ [].slice.call(g.children).sort(function(){ return Math.random() - .5; }).forEach(function(c){ g.appendChild(c); }); }, o); }
    else if(k === 'select'){ var chips = [].slice.call(card.querySelectorAll('[data-chip]')); var cur = chips.findIndex(function(c){ return c.classList.contains('on'); }); chips[cur].classList.remove('on'); var nx = chips[(cur + 1) % chips.length]; nx.classList.add('on'); M.run(id, nx, o, ctx); }
    else if(k === 'toast' || k === 'press' || k === 'cart') { if(k === 'press') M.run(id, el, o, ctx); else if(k === 'cart'){ var c = q('#v6cc', card); c.textContent = String(Number(c.textContent) + 1); M.run(id, c, o, ctx); } else V6.demoToast(card, o); }
    else M.run(id, el, o, ctx);
  };
  V6.demoToast = function(card, o){ var box = q('.v6-dm-toasts', card); box.innerHTML = ''; var t = document.createElement('div'); t.className = 'v6-dm-toast'; t.textContent = 'Commande SL-241124-0007 reçue'; box.appendChild(t); M.run('toast-spring', t, o, { force: true }); };
  Object.assign(ACT_EXTRA, {
    v6MPlay: function(a){ V6.playDemo(a, true); },
    v6MShuffle: function(a, el){ V6.playDemo('list-flip', true); },
    v6MToast: function(){ V6.playDemo('toast-spring', true); },
    v6MPress: function(){ var c = q('.v6-mcard[data-b="btn-press"]'); if(c) M.run('btn-press', q('.v6-dm-btn', c), P('btn-press'), { force: true }); },
    v6MCart: function(){ V6.playDemo('cart-bump', true); },
    v6MOpen: function(a){ V6.MS.open = V6.MS.open === a ? '' : a; V6.rerender(); setTimeout(function(){ V6.playDemo(a, true); }, 80); },
    v6MCat: function(a){ V6.MS.cat = a; V6.rerender(); },
    v6MLegacy: function(){ V6.MS.legacy = !V6.MS.legacy; V6.rerender(); },
    v6MUse: function(a){ useDialog(a); },
    v6MSave: function(a){ saveDialog(a); },
    v6MApplyMine: function(a){ var it = (V6.cfg.mgr_animlib || []).find(function(x){ return x.id === a; }); if(it && it.motion){ V6.MS.params[it.motion.b] = Object.assign({}, it.motion); delete V6.MS.params[it.motion.b].b; delete V6.MS.params[it.motion.b].on; useDialog(it.motion.b); } },
    v6MDelMine: async function(a){ if(!await confirmDlg('Supprimer le réglage', 'Supprimer ce réglage de votre bibliothèque ?', 'Supprimer', 'danger')) return; await V6.save('mgr_animlib', (V6.cfg.mgr_animlib || []).filter(function(x){ return x.id !== a; })); V6.rerender(); },
    v6MExport: function(){ var blob = new Blob([JSON.stringify({ version: 1, exported: new Date().toISOString(), mgr_animlib: V6.cfg.mgr_animlib || [], mgr_anim: V6.cfg.mgr_anim }, null, 1)], { type: 'application/json' }); var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'senluxe-bibliotheque-animations.json'; a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); }, 2000); },
    v6MAsgOn: function(a){ var p = a.split(':'); asg(p[0], p[1], function(e){ e.on = e.on === false; }); },
    v6MAsgPlay: function(a){ var p = a.split(':'); replayReal(p[0], p[1]); },
    v6MStyle: function(a){ var p = a.split(':'); applyStyle(p[0], p[1]); }
  });
  /* contrôles : mise à jour en place (sans rendu de page → pas de clignotement) */
  document.addEventListener('input', function(e){ var t = e.target, sc = t.dataset && t.dataset.v6m; if(!sc) return; ctl(t, false); });
  document.addEventListener('change', function(e){ var t = e.target, sc = t.dataset && t.dataset.v6m; if(!sc) return; ctl(t, true); });
  function ctl(t, final){
    var sc = t.dataset.v6m, id = t.dataset.b, k = t.dataset.k, v = t.type === 'range' ? Number(t.value) : t.value;
    var lb = t.type === 'range' && t.parentNode.querySelector('b'); if(lb) lb.textContent = v + (PL[k] ? PL[k][4] : '');
    if(sc === 'lib'){ P(id)[k] = v; clearTimeout(V6._mp); V6._mp = setTimeout(function(){ V6.playDemo(id, true); }, 250); return; }
    var p = sc.split(':'), side = p[0], tg = p[1];
    if(!final && t.type !== 'range') return;
    asg(side, tg, function(e){ e[k] = v; }, t.type === 'range' && !final);
  }

  /* ===== affectations (gestionnaire / site) ===== */
  function store(side){ return side === 'manager' ? (V6.cfg.mgr_anim.motion = V6.cfg.mgr_anim.motion || {}) : (D().motion = D().motion || {}); }
  async function commitSide(side, quiet){
    if(side === 'manager'){ var an = cl(V6.cfg.mgr_anim); an.style = 'custom'; await V6.save('mgr_anim', an); }
    else { if(!Object.keys(D().motion || {}).length) delete D().motion; await persist(); refreshChrome(); if(typeof apSendSoon === 'function') apSendSoon(); }
    if(!quiet) V6.rerender();
  }
  async function asg(side, tg, fn, quiet){
    var m = store(side); if(!m[tg]) return; fn(m[tg]); clearTimeout(V6._ac);
    if(quiet){ V6._ac = setTimeout(function(){ commitSide(side, true); }, 400); } else await commitSide(side, false);
  }
  function setAsg(side, tg, id, o){ var m = store(side); if(!id){ delete m[tg]; } else m[tg] = entry(id, o || Object.assign({}, DEFS[id] || {}, { trig: (DEFS[id] || {}).trig || B[id].trigs[0] })); return commitSide(side, false); }
  function replayReal(side, tg){
    if(side === 'site'){ toast('Aperçu : utilisez la fenêtre d\'aperçu du site ci-dessus (elle rejoue le brouillon).'); return; }
    var T = M.TARGETS.manager[tg], c = store('manager')[tg]; if(!T || !c) return; var els = [].slice.call(document.querySelectorAll(T.sel)).slice(0, 12);
    if(!els.length) return toast('Aucun élément correspondant sur cette page : ouvrez la rubrique concernée.');
    var b = B[c.b]; if(b.kind === 'list') M.run(c.b, els, c, { force: true }); else els.forEach(function(e){ M.run(c.b, e, c, { force: true, from: 0, ratio: 0 }); });
  }
  var STYLES = {
    none: { name: 'Aucune', map: {} },
    sobre: { name: 'Sobre', map: { stats: { b: 'count-up', dur: .8 }, toast: { b: 'toast-spring', dur: .45 }, buttons: { b: 'btn-press', dur: .4 } } },
    vivant: { name: 'Interface vivante', map: { stats: { b: 'count-up', dur: 1.1 }, bars: { b: 'bar-fill', dur: .9 }, charts: { b: 'chart-draw', dur: 1.1, stagger: .08 }, cards: { b: 'cards-cascade', dur: .7, stagger: .06 }, select: { b: 'select-ring', dur: .5 }, buttons: { b: 'btn-press', dur: .5 }, toast: { b: 'toast-spring', dur: .55 } } },
    signature: { name: 'Signature SEN LUXE', map: { logo: { b: 'logo-build', dur: .7, trig: 'load' }, stats: { b: 'count-up', dur: 1.2 }, charts: { b: 'chart-draw', dur: 1.2 }, cards: { b: 'cards-cascade', dur: .8, dir: 'diagonal', stagger: .08 }, select: { b: 'select-ring', dur: .55 }, buttons: { b: 'btn-press', dur: .5 }, toast: { b: 'toast-spring', dur: .6 } } }
  };
  var SITE_STYLES = {
    none: { name: 'Aucune', map: {} },
    elegance: { name: 'Élégance discrète', map: { logo: { b: 'logo-build', dur: .7, trig: 'load' }, nav: { b: 'nav-underline', dur: .35 }, buttons: { b: 'btn-press', dur: .45 } } },
    boutique: { name: 'Boutique vivante', map: { logo: { b: 'logo-build', dur: .7, trig: 'load' }, hero: { b: 'text-lines', dur: .9, trig: 'load' }, sections: { b: 'section-curtain', dur: .8 }, cards: { b: 'cards-cascade', dur: .8, dir: 'up', stagger: .07 }, prices: { b: 'count-up', dur: 1 }, cart: { b: 'cart-bump', dur: .5 }, nav: { b: 'nav-underline', dur: .35 }, buttons: { b: 'btn-press', dur: .5 } } }
  };
  async function applyStyle(side, key){
    var S2 = side === 'manager' ? STYLES : SITE_STYLES, st = S2[key]; if(!st) return;
    if(side === 'site' && Object.keys(D().motion || {}).length && !await confirmDlg('Remplacer les animations du brouillon', 'Les animations du brouillon du site seront remplacées par « ' + st.name + ' ». Rien n\'est publié.', 'Remplacer', 'dark')) return;
    var m = {}; Object.keys(st.map).forEach(function(t){ var e = st.map[t]; m[t] = entry(e.b, Object.assign({ trig: B[e.b].trigs[0] }, DEFS[e.b] || {}, e)); });
    if(side === 'manager') V6.cfg.mgr_anim.motion = m; else if(Object.keys(m).length) D().motion = m; else delete D().motion;
    await commitSide(side, false); toast('Style « ' + st.name + ' » ' + (side === 'manager' ? 'appliqué.' : 'ajouté au brouillon (non publié).'));
  }
  function section(side){
    var T = M.TARGETS[side === 'site' ? 'public' : side], m = store(side), S2 = side === 'manager' ? STYLES : SITE_STYLES, cur = m;
    var styles = '<div class="v6-presets">' + Object.keys(S2).map(function(k){ return '<button type="button" class="v6-preset v6-anim-style" data-act="v6MStyle" data-arg="' + side + ':' + k + '"><span>' + S2[k].name + '</span></button>'; }).join('') + '</div>';
    var rows = Object.keys(T).map(function(tg){
      var c = cur[tg], kind = T[tg].kind, opts = Object.keys(B).filter(function(id){ return B[id].kind === kind; });
      var sel = '<select data-v6a="' + side + ':' + tg + '" aria-label="' + h(T[tg].label) + '"><option value="">Aucune</option>' + opts.map(function(id){ return '<option value="' + id + '"' + (c && c.b === id ? ' selected' : '') + '>' + h(B[id].name) + '</option>'; }).join('') + '</select>';
      var extra = c ? '<div class="v6-row"><label class="v6-switch"><input type="checkbox" data-act="v6MAsgOn" data-arg="' + side + ':' + tg + '"' + (c.on !== false ? ' checked' : '') + '> Actif</label>' + (side === 'manager' ? '<button type="button" class="btn ghost" data-act="v6MAsgPlay" data-arg="' + side + ':' + tg + '">▶ Rejouer sur la page</button>' : '') + '</div>' + controls(c.b, Object.assign({ dur: .6, speed: 1, int: 1, delay: 0, stagger: .06, dir: 'up', ease: 'smooth', trig: B[c.b].trigs[0], life: 3500 }, c), side + ':' + tg) : '';
      return '<div class="v6-card"><div class="v6-card-h"><b>' + h(T[tg].label) + '</b>' + (c ? '<span class="v6-badge ' + (c.on !== false ? 'ok' : '') + '">' + h(B[c.b].name) + (c.on === false ? ' · désactivé' : '') + '</span>' : '<span class="v6-badge">aucune</span>') + '</div>' + sel + (c ? '<p class="hint">' + h(B[c.b].desc) + '</p>' : '') + extra + '</div>';
    }).join('');
    return '<h3 class="se-h">Animations d\'interface (comportements réels)</h3><p class="hint" style="margin-top:0">Chaque réglage réagit à l\'état réel : un chiffre qui change, une carte qui entre, une sélection, un clic. Choisissez un style de départ puis ajustez zone par zone.</p>' + styles + rows;
  }
  document.addEventListener('change', function(e){ var t = e.target, v = t.dataset && t.dataset.v6a; if(!v) return; var p = v.split(':'); setAsg(p[0], p[1], t.value || ''); });

  /* ===== dialogues : 3 destinations ===== */
  function useDialog(id){
    var b = B[id], o = P(id), tm = M.TARGETS.manager, ts = M.TARGETS.public;
    var opt = function(T){ return Object.keys(T).filter(function(k){ return T[k].kind === b.kind; }).map(function(k){ return '<option value="' + k + '">' + h(T[k].label) + '</option>'; }).join(''); };
    var om = opt(tm), os = opt(ts);
    var m = openModal({ title: 'Utiliser « ' + b.name + ' »', body: '<div class="v6-dest"><div class="v6-card"><b>1 · Appliquer au gestionnaire</b>' + (om ? '<select id="v6u-m">' + om + '</select><button type="button" class="btn dark" id="v6u-gm">Appliquer</button>' : '<p class="hint">Aucune zone du gestionnaire n\'est compatible avec ce comportement.</p>') + '</div><div class="v6-card"><b>2 · Préparer pour le site public</b>' + (os ? '<p class="hint">Va dans le <b>brouillon</b> : publication explicite et confirmée requise.</p><select id="v6u-s">' + os + '</select><button type="button" class="btn gold" id="v6u-gs">Ajouter au brouillon</button>' : '<p class="hint">Aucune zone du site public n\'est compatible.</p>') + '</div><div class="v6-card"><b>3 · Enregistrer dans la bibliothèque</b><p class="hint">Conserve ce réglage sans l\'appliquer.</p><button type="button" class="btn" id="v6u-sl">Enregistrer</button></div></div>', foot: '<button type="button" class="btn ghost" data-close>Fermer</button>' });
    var g = function(i){ return q(i, m.wrap); };
    if(g('#v6u-gm')) g('#v6u-gm').onclick = async function(){ await setAsg('manager', g('#v6u-m').value, id, o); requestClose(m); toast('Appliqué au gestionnaire.'); };
    if(g('#v6u-gs')) g('#v6u-gs').onclick = async function(){ await setAsg('site', g('#v6u-s').value, id, o); requestClose(m); toast('Ajouté au brouillon du site (non publié). Ouvrez SITE WEB pour l\'aperçu et la publication.'); };
    g('#v6u-sl').onclick = function(){ requestClose(m); saveDialog(id); };
  }
  function saveDialog(id){
    var b = B[id], o = P(id);
    var m = openModal({ title: 'Enregistrer dans la bibliothèque', body: '<div class="field"><label for="v6s-n">Nom du réglage</label><input id="v6s-n" maxlength="40" value="' + h(b.name + ' — mon réglage') + '"></div><p id="v6s-m" class="v6-msg"></p>', foot: '<button type="button" class="btn ghost" data-close>Annuler</button><button type="button" class="btn dark" id="v6s-ok">Enregistrer</button>' });
    q('#v6s-ok', m.wrap).onclick = async function(){ var n = q('#v6s-n', m.wrap).value.trim(); if(n.length < 2) return q('#v6s-m', m.wrap).textContent = 'Donnez un nom (2 caractères minimum).';
      var list = cl(V6.cfg.mgr_animlib || []); if(list.length >= 60) return q('#v6s-m', m.wrap).textContent = '60 éléments maximum.';
      list.push({ id: 'm-' + Math.random().toString(36).slice(2, 8), name: n, cat: 'Réglages', motion: entry(id, o), created: nowIso() });
      var r = await V6.save('mgr_animlib', list); requestClose(m); toast(r.ok ? 'Réglage enregistré dans la bibliothèque.' : 'Enregistré sur cet appareil ; erreur serveur : ' + h(r.error), r.ok ? '' : 'err'); V6.rerender(); };
  }

  /* ===== onglet bibliothèque ===== */
  function libraryTab(legacyHtml){
    var S3 = V6.MS, qq = S3.q.trim().toLowerCase();
    var ids = Object.keys(B).filter(function(id){ return (!S3.cat || B[id].cat === S3.cat) && (!qq || (B[id].name + ' ' + B[id].desc + ' ' + B[id].cat).toLowerCase().indexOf(qq) >= 0); });
    var cards = ids.map(function(id){
      var open = S3.open === id, b = B[id];
      return '<div class="v6-mcard' + (open ? ' open' : '') + '" data-b="' + id + '"><div class="v6-mdemo">' + demo(id) + '</div><div class="v6-mmeta"><span class="v6-badge">' + h(b.cat) + '</span><b>' + h(b.name) + '</b><p>' + h(b.desc) + '</p></div><div class="v6-lact"><button type="button" class="btn ghost" data-act="v6MPlay" data-arg="' + id + '">▶ Rejouer</button><button type="button" class="btn ghost" data-act="v6MOpen" data-arg="' + id + '">Réglages</button><button type="button" class="btn" data-act="v6MUse" data-arg="' + id + '">Utiliser…</button></div>' + (open ? controls(id, P(id), 'lib') : '') + '</div>';
    }).join('') || '<p class="muted">Aucun comportement.</p>';
    var mine = (V6.cfg.mgr_animlib || []).filter(function(x){ return x.motion; });
    var mineH = mine.length ? '<h3 class="se-h">Mes réglages enregistrés</h3><div class="v6-lgrid">' + mine.map(function(x){ var b = B[x.motion.b]; return '<div class="v6-lcard"><div class="v6-lmeta"><b>' + h(x.name) + '</b><small>' + h(b ? b.name : x.motion.b) + ' · ' + h(x.motion.dur || .6) + ' s</small></div><div class="v6-lact"><button type="button" class="btn" data-act="v6MApplyMine" data-arg="' + h(x.id) + '">Utiliser…</button><button type="button" class="btn ghost danger" data-act="v6MDelMine" data-arg="' + h(x.id) + '">Supprimer</button></div></div>'; }).join('') + '</div>' : '';
    return '<div class="v6-sub"><b>Comportements animés</b> : chacun réagit à l\'état réel de l\'interface (valeur, liste, sélection, clic, notification). L\'aperçu ci-dessous est le vrai moteur, pas une image. Désactivé automatiquement si l\'appareil demande « moins d\'animations ».</div>' +
      '<div class="v6-row"><input type="search" class="v6-q" id="v6mq" placeholder="Rechercher un comportement…" value="' + h(S3.q) + '" data-v6s="mq"><button type="button" class="btn ghost" data-act="v6MExport">Exporter la bibliothèque</button></div>' +
      '<div class="v6-cats">' + [''].concat(CATS).map(function(c){ return '<button type="button" class="' + (S3.cat === c ? 'on' : '') + '" data-act="v6MCat" data-arg="' + h(c) + '">' + (c || 'Tous') + '</button>'; }).join('') + '</div><div class="v6-mgrid">' + cards + '</div>' + mineH +
      '<details class="v6-legacy"' + (S3.legacy ? ' open' : '') + '><summary data-act="v6MLegacy">Effets CSS — anciens effets (v6.0) et créations personnelles</summary>' + legacyHtml + '</details>';
  }
  document.addEventListener('input', function(e){ var t = e.target; if(t.dataset && t.dataset.v6s === 'mq'){ V6.MS.q = t.value; clearTimeout(V6._mqt); V6._mqt = setTimeout(function(){ V6.rerender(); var el = document.getElementById('v6mq'); if(el){ el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 200); } });

  /* ===== assemblage avec les onglets existants ===== */
  var old = V6.studioBody;
  V6.studioBody = function(tab){
    var html = old(tab);
    if(tab === 'library') return libraryTab(html);
    if(tab === 'manager'){ var i = html.indexOf('<h3 class="se-h">Animations du gestionnaire</h3>'); if(i < 0) return html + section('manager'); return html.slice(0, i) + section('manager') + '<details class="v6-legacy"><summary>Effets CSS du gestionnaire (anciens effets)</summary>' + html.slice(i) + '</details>'; }
    if(tab === 'site'){ var a = html.indexOf('<h3 class="se-h">Animations personnalisées du site</h3>'), b2 = html.indexOf('<div class="v6-row sticky">'); if(a < 0 || b2 < 0) return html + section('site'); return html.slice(0, a) + section('site') + '<details class="v6-legacy"><summary>Effets CSS du site (anciens effets)</summary>' + html.slice(a, b2) + '</details>' + html.slice(b2); }
    return html;
  };
  /* auto-lecture des aperçus visibles (une fois), sauf si « moins d'animations » */
  V6.afterRender = (function(prev){ return function(view, tab){ if(prev) prev(view, tab); if(view !== 'studio' || tab !== 'library' || !M.supported() || typeof IntersectionObserver === 'undefined') return; var io = new IntersectionObserver(function(es){ es.forEach(function(en){ if(en.isIntersecting){ io.unobserve(en.target); V6.playDemo(en.target.dataset.b, false); } }); }, { threshold: .4 }); document.querySelectorAll('.v6-mcard').forEach(function(c){ io.observe(c); }); }; })(V6.afterRender);

  /* sauvegarde locale de l'état de la bibliothèque avant la v6.1 (retour arrière) */
  try{ if(!localStorage.getItem('slx_v6_lib_backup_v60')) localStorage.setItem('slx_v6_lib_backup_v60', JSON.stringify({ at: new Date().toISOString(), mgr_animlib: V6.cfg.mgr_animlib || [], mgr_anim: V6.cfg.mgr_anim })); }catch(e){}
  /* bascule de thème : vague circulaire */
  var _tt = ACT_EXTRA.v6Preset; if(_tt) ACT_EXTRA.v6Preset = function(a){ var ev = window.event; M.themeWipe(function(){ _tt.call(ACT_EXTRA, a); }, ev && ev.clientX, ev && ev.clientY, { dur: .75 }); };
})();
