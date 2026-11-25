/* SEN LUXE v6 — noyau : configuration, thème du gestionnaire, préférences, navigation des rubriques.
 * Isolé : si ce fichier ne se charge pas ou si ?v6=off, les boutons restent masqués et le gestionnaire est identique à la v5. */
(function(){
  'use strict';
  var off = false; try{ off = /[?&]v6=off\b/.test(location.search) || localStorage.getItem('slx_v6_off') === '1'; }catch(e){}
  if(off || typeof S === 'undefined' || typeof ACT_EXTRA === 'undefined') return;

  var KEYS = ['mgr_prefs', 'mgr_theme', 'mgr_anim', 'mgr_animlib', 'v6_notify', 'v6_notifs', 'v6_scripts'];
  var DEFAULTS = {
    mgr_prefs: { density: 'normal', startView: '', reduceMotion: false, hideHints: false },
    mgr_theme: { preset: 'classic', dark: false, colors: {}, radius: null, font: null, sidebar: null, btn: null },
    mgr_anim: { style: 'none', speed: 1, apply: {}, motion: {} },
    mgr_animlib: [],
    v6_notify: { emails: [], whatsapp: [], events: { order: true, stock: false }, lastTest: null },
    v6_notifs: { read: {}, archived: {}, seen: {} },
    v6_scripts: []
  };
  var V6 = window.V6 = { version: '6.0.0', cfg: {}, sync: {}, serverLoaded: false, tab: { settings: 'security', studio: 'manager', notifs: 'all' } };
  var h = function(s){ return esc(s); };
  V6.h = h;

  function clampN(v, d, a, b){ v = Number(v); if(!isFinite(v)) v = d; return Math.min(b, Math.max(a, v)); }
  V6.clampN = clampN;
  function readLocal(){ try{ return JSON.parse(localStorage.getItem('slx_v6_cfg') || '{}') || {}; }catch(e){ return {}; } }
  function writeLocal(){ try{ localStorage.setItem('slx_v6_cfg', JSON.stringify(V6.cfg)); }catch(e){} }
  function merged(k, v){ var d = JSON.parse(JSON.stringify(DEFAULTS[k])); if(Array.isArray(d)) return Array.isArray(v) ? v : d; return Object.assign(d, v && typeof v === 'object' ? v : {}); }
  KEYS.forEach(function(k){ V6.cfg[k] = merged(k, readLocal()[k]); });

  /* ---- enregistrement : serveur (si session) + miroir local ---- */
  V6.save = async function(k, val){
    V6.cfg[k] = val; writeLocal(); V6.applyAll();
    if(typeof AN !== 'undefined' && AN.session && ADM.pass){
      try{ await rpc('senluxe_admin_setting_set', { p_token: ADM.pass, p_key: k, p_value: val }); V6.sync[k] = 'server'; }
      catch(e){ V6.sync[k] = 'error'; V6.syncErr = e.message; return { ok: false, error: e.message }; }
    } else V6.sync[k] = 'local';
    return { ok: true, where: V6.sync[k] };
  };
  V6.syncLabel = function(k){ var s = V6.sync[k]; return s === 'server' ? 'Enregistré sur le serveur' : s === 'local' ? 'Enregistré sur cet appareil (connectez-vous pour le conserver sur le serveur)' : s === 'error' ? 'Erreur d\'enregistrement serveur : ' + (V6.syncErr || '') : V6.serverLoaded ? 'Synchronisé' : ''; };
  V6.loadServer = async function(){
    if(V6.serverLoaded || V6.loading || typeof AN === 'undefined' || !AN.session || !ADM.pass) return;
    V6.loading = true;
    try{
      var st = await rpc('senluxe_admin_settings', { p_token: ADM.pass }) || {};
      KEYS.forEach(function(k){ if(st[k] !== undefined && st[k] !== null) { V6.cfg[k] = merged(k, st[k]); V6.sync[k] = 'server'; } });
      writeLocal(); V6.serverLoaded = true; V6.applyAll();
      if((UI.view === 'settings' || UI.view === 'studio') && !document.querySelector('.v6-editing')) V6.rerender();
    }catch(e){ V6.syncErr = e.message; }
    V6.loading = false;
  };

  /* ---- contraste WCAG ---- */
  function rgb(c){ c = String(c || '').trim(); var m = /^#([0-9a-f]{6})$/i.exec(c); if(!m){ m = /^#([0-9a-f]{3})$/i.exec(c); if(!m) return null; c = m[1].split('').map(function(x){ return x + x; }).join(''); } else c = m[1]; return [0, 2, 4].map(function(i){ return parseInt(c.substr(i, 2), 16); }); }
  function lum(c){ var a = rgb(c); if(!a) return null; a = a.map(function(v){ v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * a[0] + .7152 * a[1] + .0722 * a[2]; }
  V6.contrast = function(a, b){ var x = lum(a), y = lum(b); if(x === null || y === null) return null; var hi = Math.max(x, y), lo = Math.min(x, y); return (hi + .05) / (lo + .05); };

  /* ---- thème du gestionnaire ---- */
  var HEX = /^#[0-9a-f]{6}$/i;
  V6.PRESETS = {
    classic:  { name: 'Classique (actuel)', colors: {} },
    champagne:{ name: 'Rose champagne', colors: { gold: '#a9626d', goldBright: '#c98591', ivory: '#fbf5f4', sand: '#f3e6e4' } },
    emerald:  { name: 'Émeraude', colors: { gold: '#2f6b57', goldBright: '#3f9a7a', ivory: '#f4f8f6', sand: '#e6efeb' } },
    sapphire: { name: 'Saphir', colors: { gold: '#2c4f8a', goldBright: '#4a74c0', ivory: '#f4f6fa', sand: '#e5eaf3', sidebar: '#0d1424' } },
    graphite: { name: 'Graphite', colors: { gold: '#5b6573', goldBright: '#8794a6', ivory: '#f4f5f7', sand: '#e7e9ed', sidebar: '#1c2128' } }
  };
  V6.themeCss = function(t){
    var c = Object.assign({}, (V6.PRESETS[t.preset] || V6.PRESETS.classic).colors, t.colors || {}), o = [], r = [];
    var ok = function(v){ return HEX.test(String(v || '')); };
    if(ok(c.gold)) o.push('--gold:' + c.gold); if(ok(c.goldBright)) o.push('--gold-bright:' + c.goldBright);
    if(ok(c.ivory)) o.push('--ivory:' + c.ivory); if(ok(c.sand)) o.push('--sand:' + c.sand);
    if(ok(c.danger)) o.push('--danger:' + c.danger); if(ok(c.okc)) o.push('--ok:' + c.okc);
    if(t.radius !== null && t.radius !== undefined && t.radius !== '') o.push('--radius:' + clampN(t.radius, 4, 0, 18) + 'px');
    var side = ok(c.sidebar) ? c.sidebar : null;
    if(t.dark){ o.push('--ivory:#14130f', '--white:#1d1b16', '--black:#f1ece0', '--line:rgba(255,255,255,.14)', '--line-soft:rgba(255,255,255,.08)', '--mute:rgba(241,236,224,.62)', '--sand:#26231c', '--danger-bg:#3a1c1c', '--ok-bg:#16301f', '--warn-bg:#3a2d10'); side = side || '#0a0a0a';
      r.push('.sidebar{background:' + side + '!important}.toast{background:#2a2720!important;color:#f1ece0!important}.topbar{background:rgba(20,19,15,.97)!important}.btn.dark{color:#14130f!important}.admin-gate-card{background:#1d1b16}input,select,textarea{background:#14130f;color:#f1ece0;border-color:rgba(255,255,255,.18)}'); }
    else if(side) r.push('.sidebar{background:' + side + '!important}');
    if(t.font === 'serif') r.push('body{font-family:Georgia,"Playfair Display",serif}');
    if(t.font === 'system') r.push('body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif}');
    if(t.sidebar === 'narrow') r.push('.app{grid-template-columns:216px minmax(0,1fr)!important}');
    if(t.sidebar === 'wide') r.push('.app{grid-template-columns:288px minmax(0,1fr)!important}');
    if(t.btn === 'pill') r.push('.btn{border-radius:999px}'); if(t.btn === 'square') r.push('.btn{border-radius:0}'); if(t.btn === 'soft') r.push('.btn{border-radius:8px}');
    return (o.length ? ':root{' + o.join(';') + '}' : '') + r.join('\n');
  };
  var DENS = { compact: '12.5px', normal: '', large: '15px' };

  /* ---- animations du gestionnaire (cibles fixes) ---- */
  V6.MGR_TARGETS = {
    view:   { sel: '#view.v6e > *', off: 1 },
    cards:  { sel: '#view.v6e .stat,#view.v6e .an-card,#view.v6e .ccard', off: 1 },
    buttons:{ sel: '.btn:hover', off: 1 },
    modal:  { sel: '.modal', off: 1 },
    toast:  { sel: '.toast', off: 1 },
    nav:    { sel: '.nav button:hover', off: 1 }
  };
  V6.MGR_TARGET_LABELS = { view: 'Changement de rubrique', cards: 'Cartes et indicateurs', buttons: 'Boutons (au survol)', modal: 'Fenêtres', toast: 'Notifications', nav: 'Menu latéral (au survol)' };
  V6.allLib = function(){ return (V6.builtins ? V6.builtins() : []).concat((V6.cfg.mgr_animlib || []).filter(function(x){ return !x.disabled; })); };
  V6.applyAll = function(){
    var pr = V6.cfg.mgr_prefs, th = V6.cfg.mgr_theme, an = V6.cfg.mgr_anim, root = document.documentElement;
    var st = document.getElementById('v6-theme'); if(!st){ st = document.createElement('style'); st.id = 'v6-theme'; document.head.appendChild(st); }
    var css = V6.themeCss(th);
    if(DENS[pr.density]) css += '\nbody{font-size:' + DENS[pr.density] + '}';
    st.textContent = css;
    root.classList.toggle('v6-reduce', !!pr.reduceMotion); root.classList.toggle('v6-nohints', !!pr.hideHints);
    root.setAttribute('data-v6', 'on');
    var sa = document.getElementById('v6-anim'); if(!sa){ sa = document.createElement('style'); sa.id = 'v6-anim'; document.head.appendChild(sa); }
    var apply = {}; Object.keys(an.apply || {}).forEach(function(k){ var a = Object.assign({}, an.apply[k]); a.dur = clampN((a.dur || .5) / clampN(an.speed, 1, .25, 3), .5, .08, 6); apply[k] = a; });
    V6.applyMotion();
    sa.textContent = (!pr.reduceMotion && typeof SLX_ANIM_BUILD === 'function') ? SLX_ANIM_BUILD(V6.allLib(), apply, V6.MGR_TARGETS) : '';
  };

  V6.applyMotion = function(){
    if(typeof SLX_MOTION === 'undefined') return;
    var m = (V6.cfg.mgr_anim || {}).motion, pr = V6.cfg.mgr_prefs, scr = (V6.cfg.mgr_anim || {}).scripts || [], key = JSON.stringify([m || null, !!pr.reduceMotion, V6.cfg.mgr_anim.speed, scr]);
    if(key === V6._mk) return; V6._mk = key;
    if(typeof SLX_SCRIPT !== 'undefined'){ if(pr.reduceMotion || !scr.length) SLX_SCRIPT.uninstall(); else SLX_SCRIPT.install(scr, 'manager', { gate: function(){ var v = document.getElementById('view'); return !v || v.classList.contains('v6e'); } }); }
    if(!m || pr.reduceMotion || !Object.keys(m).length){ SLX_MOTION.uninstall(); return; }
    var cfg = {}; Object.keys(m).forEach(function(k){ cfg[k] = Object.assign({}, m[k], { speed: (m[k].speed || 1) * (V6.cfg.mgr_anim.speed || 1) }); });
    SLX_MOTION.install(cfg, SLX_MOTION.TARGETS.manager, { gate: function(){ var v = document.getElementById('view'); return !v || v.classList.contains('v6e'); } });
  };
  /* ---- animation d'entrée de rubrique (sans clignoter lors des simples re-rendus) ---- */
  var _setView = window.setView;
  if(typeof _setView === 'function'){
    window.setView = function(v){ var el0 = document.getElementById('view'); if(el0 && el0.__v6key && el0.__v6key.split(':')[0] !== v) el0.__v6key = null; if(el0){ el0.classList.remove('v6e'); void el0.offsetWidth; el0.classList.add('v6e'); clearTimeout(V6._ev); V6._ev = setTimeout(function(){ el0.classList.remove('v6e'); }, 1600); } return _setView.apply(this, arguments); };
  }

  /* ---- rendu des rubriques ---- */
  V6.SETTINGS_TABS = [['security', 'Sécurité'], ['features', 'Autres paramètres'], ['pixels', 'Pixels et intégrations'], ['notify', 'Notifications de commande'], ['prefs', 'Préférences générales']];
  V6.STUDIO_TABS = [['manager', 'Gestionnaire'], ['site', 'SITE WEB'], ['library', 'Bibliothèque et création']];
  V6.tabsHtml = function(view, list){
    return '<div class="v6-tabs" role="tablist">' + list.map(function(t){ return '<button type="button" role="tab" aria-selected="' + (V6.tab[view] === t[0]) + '" class="' + (V6.tab[view] === t[0] ? 'on' : '') + '" data-act="v6Tab" data-arg="' + view + ':' + t[0] + '">' + h(t[1]) + '</button>'; }).join('') + '</div>';
  };
  V6.render = function(v, force, syncOnly){
    V6.loadServer();
    var view = UI.view, tab = V6.tab[view], body = '';
    try{
      if(view === 'notifs') body = (V6.notifBody ? V6.notifBody() : '');
      else if(view === 'settings') body = (V6.settingsBody ? V6.settingsBody(tab) : '<p class="muted">Module indisponible.</p>');
      else body = (V6.studioBody ? V6.studioBody(tab) : '<p class="muted">Module indisponible.</p>');
    }catch(e){ console.error(e); body = '<div class="banner">Cette section a rencontré une erreur : ' + h(e.message) + '. Le reste du gestionnaire n\'est pas affecté.</div>'; }
    var head = view === 'notifs' ? ['CENTRE DE NOTIFICATIONS', 'Messages techniques et d\'administration, classés par priorité.', []] : view === 'settings' ? ['PARAMÈTRES', 'Sécurité, fonctionnalités, intégrations et préférences.', V6.SETTINGS_TABS] : ['COULEURS ET ANIMATIONS', 'Apparence du gestionnaire et du site web, bibliothèque d\'animations.', V6.STUDIO_TABS];
    var html = '<div class="v6-wrap" data-v6-view="' + view + '"><div class="v6-head"><h2>' + head[0] + '</h2><p>' + head[1] + '</p></div>' + (head[2].length ? V6.tabsHtml(view, head[2]) : '') + '<div class="v6-body">' + body + '</div></div>';
    /* Garde-fous anti-clignotement : (1) HTML identique => on ne touche pas au DOM ; (2) un rendu déclenché par le reste de
     * l'application (synchronisation, temps réel) ne remplace jamais l'écran pendant qu'un champ est en cours de saisie. */
    if(syncOnly){ v.__v6html = html; return; }
    var same = v.__v6key === view + ':' + tab && v.querySelector('.v6-wrap');
    if(same && v.__v6html === html) return;
    var ae = document.activeElement;
    if(same && !force && ae && v.contains(ae) && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)){ V6.skipped = (V6.skipped || 0) + 1; return; }
    var y = window.scrollY, bodyEl = v.querySelector('.v6-body'), keep = same && bodyEl ? bodyEl.scrollLeft : 0;
    v.innerHTML = html; v.__v6html = html; v.__v6key = view + ':' + tab;
    if(same) window.scrollTo(0, y);
    if(view === 'studio' && tab === 'site' && typeof apMountPreview === 'function') apMountPreview();
    if(V6.afterRender) V6.afterRender(view, tab);
  };
  V6.rerender = function(){ if(UI.view === 'settings' || UI.view === 'studio' || UI.view === 'notifs') V6.render(document.getElementById('view'), true); };
  Object.assign(ACT_EXTRA, {
    v6Tab: function(a){ var p = String(a).split(':'); if(!V6.tab[p[0]]) return; V6.tab[p[0]] = p[1]; V6.rerender(); }
  });

  /* ---- code oublié (écran de connexion) ---- */
  V6.recoveryOpen = function(){
    var m = openModal({ title: 'Code oublié', body: '<p class="hint" style="margin-top:0">Saisissez votre <b>code de secours</b> (généré dans PARAMÈTRES › Sécurité) puis choisissez un nouveau code. Le code de secours ne sert qu\'une fois ; toutes les sessions sont ensuite fermées.</p><div class="form-grid"><div class="field full"><label for="v6rc">Code de secours</label><input id="v6rc" autocomplete="off" autocapitalize="characters" placeholder="XXXX-XXXX-XXXX-XXXX"></div><div class="field"><label for="v6rn">Nouveau code (10 caractères min., lettre + chiffre)</label><input type="password" id="v6rn" autocomplete="new-password"></div><div class="field"><label for="v6rn2">Confirmer</label><input type="password" id="v6rn2" autocomplete="new-password"></div></div><p id="v6rs" class="hint" aria-live="polite"></p>', foot: '<button type="button" class="btn ghost" data-close>Annuler</button><button type="button" class="btn dark" id="v6rgo">Changer le code</button>' });
    m.wrap.style.zIndex = '2147483000';
    var q = function(i){ return m.wrap.querySelector(i); };
    q('#v6rgo').onclick = async function(){
      var st = q('#v6rs'), c = q('#v6rc').value.trim(), n = q('#v6rn').value, n2 = q('#v6rn2').value;
      if(!c) return st.textContent = 'Saisissez le code de secours.';
      if(n !== n2) return st.textContent = 'Les deux codes ne correspondent pas.';
      if(n.length < 10 || !/[A-Za-z]/.test(n) || !/[0-9]/.test(n)) return st.textContent = 'Le nouveau code doit contenir au moins 10 caractères, avec une lettre et un chiffre.';
      st.textContent = 'Vérification…'; q('#v6rgo').disabled = true;
      try{
        var r = await rpc('senluxe_admin_recover', { p_code: c, p_new: n, p_label: (navigator.userAgent || '').slice(0, 100) });
        if(r && r.ok){ requestClose(m); toast('Code modifié. Connectez-vous avec le nouveau code.'); var s2 = document.getElementById('adminGateStatus'); if(s2) s2.textContent = 'Code modifié : connectez-vous avec votre nouveau code.'; }
        else st.textContent = (r && r.error) || 'Récupération refusée.';
      }catch(e){ st.textContent = /introuvable|not find|PGRST202/i.test(e.message) ? 'La récupération par code de secours n\'est pas encore installée sur le serveur.' : e.message; }
      q('#v6rgo').disabled = false;
    };
  };
  ACT_EXTRA.v6Recover = function(){ V6.recoveryOpen(); };
  function gateLink(){
    var f = document.querySelector('#adminGate form'); if(!f || document.getElementById('v6Forgot')) return;
    var b = document.createElement('button'); b.type = 'button'; b.id = 'v6Forgot'; b.className = 'linkbtn v6-forgot'; b.textContent = 'Code oublié ?'; b.setAttribute('data-act', 'v6Recover'); f.appendChild(b);
  }

  /* ---- démarrage ---- */
  V6.applyAll(); gateLink();
  ['navSettings', 'navStudio', 'navNotif'].forEach(function(id){ var b = document.getElementById(id); if(b) b.hidden = false; });
  var tries = 0, iv = setInterval(function(){ V6.loadServer(); if(V6.serverLoaded || ++tries > 60) clearInterval(iv); }, 2000);
  var sv = V6.cfg.mgr_prefs.startView; if(sv && /^(home|products|orders|carts|settings|studio|details|notifs)$/.test(sv) && typeof setView === 'function'){ setTimeout(function(){ try{ setView(sv); }catch(e){} }, 0); }
})();
