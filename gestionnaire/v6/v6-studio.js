/* SEN LUXE v6 — COULEURS ET ANIMATIONS : studio du gestionnaire, studio du site web (moteur Apparence existant), bibliothèque. */
(function(){
  'use strict';
  var V6 = window.V6; if(!V6) return;
  var h = V6.h, q = function(s, r){ return (r || document).querySelector(s); }, I = 'var(--v6-i,1)';
  var cl = function(o){ return JSON.parse(JSON.stringify(o)); };
  var connected = function(){ return typeof AN !== 'undefined' && AN.session && ADM.pass; };

  /* ===================== BIBLIOTHÈQUE INTÉGRÉE ===================== */
  var TR = function(a, b){ return '{opacity:0;transform:' + a + '}to{opacity:1;transform:' + (b || 'none') + '}'; };
  var CATS = ['Apparition', 'Survol', 'Boutons', 'Textes', 'Cartes', 'Menus', 'Chargement', 'Notifications', 'Transitions'];
  var B = [];
  function P(id, name, cat, body, dur, ease){ B.push({ id: id, name: name, cat: cat, css: '@keyframes ' + id + '{' + body + '}', dur: dur || .6, ease: ease || 'ease', int: 1, builtin: true }); }
  var s = function(x){ return 'scale(calc(1 + ' + x + '*' + I + '))'; }, ty = function(x){ return 'translateY(calc(' + x + 'px*' + I + '))'; }, tx = function(x){ return 'translateX(calc(' + x + 'px*' + I + '))'; };
  P('fade-in', 'Fondu', 'Apparition', 'from{opacity:0}to{opacity:1}', .6);
  P('fade-up', 'Fondu vers le haut', 'Apparition', 'from' + TR(ty(24)), .7, 'cubic-bezier(.2,.7,.2,1)');
  P('fade-down', 'Fondu vers le bas', 'Apparition', 'from' + TR(ty(-24)), .7);
  P('fade-left', 'Entrée par la gauche', 'Apparition', 'from' + TR(tx(-30)), .7);
  P('fade-right', 'Entrée par la droite', 'Apparition', 'from' + TR(tx(30)), .7);
  P('zoom-in', 'Zoom d\'apparition', 'Apparition', 'from' + TR('scale(calc(1 - .08*' + I + '))'), .6);
  P('blur-in', 'Apparition floue', 'Apparition', 'from{opacity:0;filter:blur(calc(10px*' + I + '))}to{opacity:1;filter:blur(0)}', .8);
  P('rise-soft', 'Montée douce', 'Apparition', 'from' + TR(ty(10)), 1.1, 'ease-out');
  P('clip-reveal', 'Révélation en rideau', 'Apparition', 'from{clip-path:inset(0 0 100% 0);opacity:0}to{clip-path:inset(0 0 0 0);opacity:1}', .9);
  P('pulse', 'Pulsation', 'Survol', '0%,100%{transform:scale(1)}50%{transform:' + s('.05') + '}', .8);
  P('float', 'Flottement', 'Survol', '0%,100%{transform:translateY(0)}50%{transform:' + ty(-6) + '}', 1.4, 'ease-in-out');
  P('wiggle', 'Oscillation', 'Survol', '0%,100%{transform:rotate(0)}25%{transform:rotate(calc(-4deg*' + I + '))}75%{transform:rotate(calc(4deg*' + I + '))}', .6);
  P('glow-gold', 'Halo doré', 'Survol', '0%,100%{box-shadow:0 0 0 0 rgba(212,175,55,0)}50%{box-shadow:0 0 calc(20px*' + I + ') rgba(212,175,55,.55)}', 1.2);
  P('heartbeat', 'Battement', 'Survol', '0%,100%{transform:scale(1)}14%{transform:' + s('.08') + '}28%{transform:scale(1)}42%{transform:' + s('.08') + '}70%{transform:scale(1)}', 1);
  P('tada', 'Tada', 'Survol', '0%,100%{transform:scale(1) rotate(0)}10%,20%{transform:scale(calc(1 - .06*' + I + ')) rotate(calc(-3deg*' + I + '))}30%,50%,70%{transform:' + s('.08') + ' rotate(calc(3deg*' + I + '))}40%,60%{transform:' + s('.08') + ' rotate(calc(-3deg*' + I + '))}', .9);
  P('press', 'Appui', 'Boutons', '0%,100%{transform:scale(1)}50%{transform:scale(calc(1 - .05*' + I + '))}', .35);
  P('btn-lift', 'Soulèvement', 'Boutons', 'from{transform:translateY(0);box-shadow:0 0 0 rgba(0,0,0,0)}to{transform:' + ty(-3) + ';box-shadow:0 calc(8px*' + I + ') 18px rgba(0,0,0,.2)}', .3);
  P('bounce', 'Rebond', 'Boutons', '0%,100%{transform:translateY(0)}40%{transform:' + ty(-8) + '}60%{transform:' + ty(-3) + '}', .6, 'ease-out');
  P('jelly', 'Gélatine', 'Boutons', '0%,100%{transform:scale(1,1)}30%{transform:scale(1.15,.85)}50%{transform:scale(.9,1.1)}70%{transform:scale(1.05,.95)}', .7);
  P('nudge', 'Poussée latérale', 'Boutons', '0%,100%{transform:translateX(0)}50%{transform:' + tx(5) + '}', .4);
  P('spacing-in', 'Espacement de lettres', 'Textes', 'from{opacity:0;letter-spacing:calc(.35em*' + I + ')}to{opacity:1;letter-spacing:normal}', 1);
  P('text-glow', 'Lueur du texte', 'Textes', '0%,100%{text-shadow:0 0 0 rgba(212,175,55,0)}50%{text-shadow:0 0 calc(14px*' + I + ') rgba(212,175,55,.8)}', 1.6);
  P('focus-in', 'Mise au point', 'Textes', 'from{opacity:0;filter:blur(calc(12px*' + I + '));letter-spacing:.2em}to{opacity:1;filter:blur(0);letter-spacing:normal}', .9);
  P('drop-in', 'Chute douce', 'Textes', 'from' + TR(ty(-18)), .7, 'cubic-bezier(.34,1.56,.64,1)');
  P('card-lift', 'Carte soulevée', 'Cartes', 'from{transform:translateY(0);box-shadow:0 0 0 rgba(0,0,0,0)}to{transform:' + ty(-6) + ';box-shadow:0 calc(14px*' + I + ') 28px rgba(0,0,0,.14)}', .35);
  P('tilt-in', 'Entrée inclinée', 'Cartes', 'from' + TR('perspective(600px) rotateX(calc(12deg*' + I + ')) translateY(20px)'), .8);
  P('flip-in', 'Retournement', 'Cartes', 'from' + TR('perspective(800px) rotateY(calc(-60deg*' + I + '))'), .9);
  P('pop-in', 'Apparition en ressort', 'Cartes', '0%{opacity:0;transform:scale(calc(1 - .12*' + I + '))}70%{opacity:1;transform:' + s('.03') + '}100%{opacity:1;transform:scale(1)}', .6);
  P('menu-down', 'Déroulé du menu', 'Menus', 'from' + TR(ty(-12)), .35, 'ease-out');
  P('menu-right', 'Glissement du menu', 'Menus', 'from' + TR(tx(-16)), .35, 'ease-out');
  P('menu-clip', 'Menu en rideau', 'Menus', 'from{clip-path:inset(0 0 100% 0)}to{clip-path:inset(0 0 0 0)}', .4);
  P('spin', 'Rotation', 'Chargement', 'from{transform:rotate(0)}to{transform:rotate(360deg)}', 1, 'linear');
  P('breathe', 'Respiration', 'Chargement', '0%,100%{opacity:.45}50%{opacity:1}', 1.6, 'ease-in-out');
  P('load-pulse', 'Pulsation de chargement', 'Chargement', '0%,100%{transform:scale(.92);opacity:.6}50%{transform:scale(1);opacity:1}', 1.2, 'ease-in-out');
  P('shake', 'Secousse', 'Notifications', '0%,100%{transform:translateX(0)}20%{transform:' + tx(-8) + '}40%{transform:' + tx(8) + '}60%{transform:' + tx(-5) + '}80%{transform:' + tx(5) + '}', .5);
  P('notif-pop', 'Notification en ressort', 'Notifications', '0%{opacity:0;transform:scale(.8)}60%{opacity:1;transform:scale(1.05)}100%{transform:scale(1)}', .45);
  P('slide-in-right', 'Entrée latérale', 'Notifications', 'from' + TR(tx(40)), .4, 'ease-out');
  P('attention', 'Attention', 'Notifications', '0%,100%{transform:scale(1)}50%{transform:' + s('.1') + '}', .7);
  P('page-fade', 'Fondu de page', 'Transitions', 'from{opacity:0}to{opacity:1}', .35);
  P('page-slide', 'Glissement de page', 'Transitions', 'from' + TR(ty(14)), .4, 'ease-out');
  P('page-zoom', 'Zoom de page', 'Transitions', 'from' + TR('scale(calc(1 - .03*' + I + '))'), .4);
  V6.builtins = function(){ return B; };
  V6.CATS = CATS;
  function byId(id){ return V6.libAll().find(function(x){ return x.id === id; }); }
  V6.libAll = function(){
    var mine = V6.cfg.mgr_animlib || [], seen = {}; mine.forEach(function(x){ seen[x.id] = 1; });
    var site = (D().animLib || []).filter(function(x){ return !seen[x.id] && !B.some(function(b){ return b.id === x.id; }); }).map(function(x){ return Object.assign({ origin: 'site', cat: 'Personnalisées' }, x); });
    return B.concat(mine.map(function(x){ return Object.assign({ origin: 'lib' }, x); }), site);
  };

  /* ===================== TEST / APERÇU ===================== */
  V6.play = function(el, it, o){
    if(!el || !it || typeof SLX_ANIM_VALIDATE !== 'function') return false;
    var v = SLX_ANIM_VALIDATE(it.css, { prefix: 'slx6-' }); if(!v.ok) return false;
    var st = document.getElementById('v6-test'); if(!st){ st = document.createElement('style'); st.id = 'v6-test'; document.head.appendChild(st); }
    if(st.textContent.indexOf('@keyframes ' + v.names[0] + '{') < 0) st.textContent += '\n' + v.css;
    o = o || {}; el.style.animation = 'none'; void el.offsetWidth;
    el.style.setProperty('--v6-i', V6.clampN(o.int, it.int || 1, .2, 2));
    el.style.animation = v.names[0] + ' ' + V6.clampN(o.dur, it.dur || .6, .1, 6) + 's ' + (SLX_ANIM_EASES.indexOf(o.ease) >= 0 ? o.ease : (SLX_ANIM_EASES.indexOf(it.ease) >= 0 ? it.ease : 'ease')) + ' both';
    return true;
  };

  /* ===================== STUDIO : GESTIONNAIRE ===================== */
  V6.TD = null; /* thème en cours d'édition (brouillon non enregistré) */
  function td(){ if(!V6.TD) V6.TD = cl(V6.cfg.mgr_theme); return V6.TD; }
  function effColors(t){ return Object.assign({ gold: '#b8935f', goldBright: '#d4af37', ivory: '#faf9f6', sand: '#f3efe7', sidebar: '#0a0a0a' }, (V6.PRESETS[t.preset] || V6.PRESETS.classic).colors, t.colors || {}); }
  function checks(t){
    var c = effColors(t), txt = t.dark ? '#f1ece0' : '#0a0a0a', bg = t.dark ? '#14130f' : c.ivory;
    return [['Texte sur fond de page', txt, bg], ['Menu actif (accent sur menu)', c.goldBright, c.sidebar], ['Bouton doré (texte noir)', '#0a0a0a', c.goldBright], ['Surtitres (accent sur fond)', c.gold, bg]].map(function(r){ var k = V6.contrast(r[1], r[2]); var soft = r[0].indexOf('Surtitres') === 0; return { label: r[0], ratio: k, lvl: k === null ? 'bad' : k >= 4.5 ? 'ok' : (k >= 3 || soft) ? 'warn' : 'bad' }; });
  }
  var STYLES = {
    none:   { name: 'Aucune', speed: 1, apply: {} },
    sobre:  { name: 'Sobre', speed: 1, apply: { view: { anim: 'page-fade', dur: .3 }, modal: { anim: 'fade-in', dur: .25 } } },
    fluide: { name: 'Fluide', speed: 1, apply: { view: { anim: 'page-slide', dur: .4 }, modal: { anim: 'zoom-in', dur: .3 }, toast: { anim: 'slide-in-right', dur: .35 } } },
    dyn:    { name: 'Dynamique', speed: 1.2, apply: { view: { anim: 'fade-up', dur: .45 }, cards: { anim: 'pop-in', dur: .5 }, buttons: { anim: 'press', dur: .3 }, modal: { anim: 'notif-pop', dur: .35 }, toast: { anim: 'notif-pop', dur: .4 } } },
    luxe:   { name: 'Luxe', speed: 1, apply: { view: { anim: 'blur-in', dur: .7 }, cards: { anim: 'rise-soft', dur: .9 }, modal: { anim: 'fade-up', dur: .5 }, toast: { anim: 'fade-left', dur: .6 } } },
    cine:   { name: 'Cinématique', speed: 1, apply: { view: { anim: 'clip-reveal', dur: .9 }, cards: { anim: 'tilt-in', dur: .9 }, modal: { anim: 'flip-in', dur: .6 }, toast: { anim: 'slide-in-right', dur: .5 } } },
    rapide: { name: 'Rapide', speed: 2, apply: { view: { anim: 'page-fade', dur: .2 }, modal: { anim: 'fade-in', dur: .15 } } },
    elegant:{ name: 'Élégant lent', speed: .8, apply: { view: { anim: 'fade-in', dur: 1 }, cards: { anim: 'fade-up', dur: 1.1 }, modal: { anim: 'fade-down', dur: .8 }, toast: { anim: 'fade-in', dur: .8 } } }
  };
  var SW = { gold: 'Couleur principale', goldBright: 'Accent vif', ivory: 'Fond des pages', sand: 'Fond secondaire', sidebar: 'Menu latéral' };
  function mgrTab(){
    var t = td(), cur = V6.cfg.mgr_theme, dirty = JSON.stringify(t) !== JSON.stringify(cur), c = effColors(t), an = V6.cfg.mgr_anim;
    var ck = checks(t), blocked = ck.some(function(x){ return x.lvl === 'bad'; });
    var pre = Object.keys(V6.PRESETS).map(function(k){ var p = V6.PRESETS[k].colors, g = p.goldBright || '#d4af37', gd = p.gold || '#b8935f'; return '<button type="button" class="v6-preset ' + (t.preset === k && !Object.keys(t.colors || {}).length ? 'on' : '') + '" data-act="v6Preset" data-arg="' + k + '"><i style="background:linear-gradient(135deg,' + gd + ' 50%,' + g + ' 50%)"></i><span>' + h(V6.PRESETS[k].name) + '</span></button>'; }).join('');
    var cols = Object.keys(SW).map(function(k){ return '<div class="field"><label for="v6c-' + k + '">' + SW[k] + '</label><div class="v6-colorrow"><input type="color" id="v6c-' + k + '" value="' + h((c[k] || '#ffffff')) + '" data-v6s="color" data-k="' + k + '"><code>' + h(c[k] || '') + '</code></div></div>'; }).join('');
    var opt = function(a, v){ return a.map(function(o){ return '<option value="' + o[0] + '"' + (String(v === null || v === undefined ? '' : v) === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join(''); };
    var anim = Object.keys(STYLES).map(function(k){ return '<button type="button" class="v6-preset v6-anim-style ' + (an.style === k ? 'on' : '') + '" data-act="v6AnimStyle" data-arg="' + k + '"><span>' + STYLES[k].name + '</span></button>'; }).join('');
    var rows = Object.keys(V6.MGR_TARGETS).map(function(k){ var a = (an.apply || {})[k] || {}; return '<div class="v6-arow"><span>' + h(V6.MGR_TARGET_LABELS[k]) + '</span><select data-v6s="manim" data-t="' + k + '" aria-label="Animation : ' + h(V6.MGR_TARGET_LABELS[k]) + '"><option value="">Aucune</option>' + V6.libAll().filter(function(x){ return !x.disabled; }).map(function(x){ return '<option value="' + h(x.id) + '"' + (a.anim === x.id ? ' selected' : '') + '>' + h(x.name) + '</option>'; }).join('') + '</select><input type="number" step="0.05" min="0.1" max="5" value="' + h(a.dur || .5) + '" data-v6s="mdur" data-t="' + k + '" aria-label="Durée (s)"><small>s</small></div>'; }).join('');
    return '<div class="v6-sub">Apparence du gestionnaire — s\'applique à <b>cet espace d\'administration uniquement</b>. Le site public n\'est jamais modifié ici.</div>' +
      '<h3 class="se-h">Palettes</h3><div class="v6-presets">' + pre + '</div><label class="v6-switch"><input type="checkbox" data-v6s="dark"' + (t.dark ? ' checked' : '') + '> Mode sombre</label>' +
      '<h3 class="se-h">Couleurs personnalisées</h3><div class="v6-colors">' + cols + '</div>' +
      '<h4 class="v6-h4">Contrastes (lisibilité)</h4><ul class="v6-ck">' + ck.map(function(x){ return '<li class="' + x.lvl + '"><span>' + h(x.label) + '</span><b>' + (x.ratio ? x.ratio.toFixed(1) + ':1' : '—') + '</b>' + (x.lvl === 'ok' ? '✓ AA' : x.lvl === 'warn' ? '⚠ limite' : '✕ illisible') + '</li>'; }).join('') + '</ul>' + (blocked ? '<p class="hint warn">Un contraste est trop faible (< 3:1) : l\'enregistrement est bloqué pour préserver la lisibilité.</p>' : '') +
      '<h3 class="se-h">Formats</h3><div class="form-grid"><div class="field"><label for="v6-rad">Arrondi des angles : <b>' + h(t.radius === null || t.radius === undefined || t.radius === '' ? 4 : t.radius) + ' px</b></label><input type="range" id="v6-rad" min="0" max="18" value="' + h(t.radius === null || t.radius === undefined || t.radius === '' ? 4 : t.radius) + '" data-v6s="radius"></div><div class="field"><label for="v6-btn">Forme des boutons</label><select id="v6-btn" data-v6s="btn">' + opt([['', 'Par défaut'], ['square', 'Carrés'], ['soft', 'Arrondis'], ['pill', 'Pilule']], t.btn) + '</select></div><div class="field"><label for="v6-fnt">Police</label><select id="v6-fnt" data-v6s="font">' + opt([['', 'Montserrat (actuelle)'], ['serif', 'Serif classique'], ['system', 'Système']], t.font) + '</select></div><div class="field"><label for="v6-sb">Largeur du menu</label><select id="v6-sb" data-v6s="sidebar">' + opt([['', 'Normale'], ['narrow', 'Étroite'], ['wide', 'Large']], t.sidebar) + '</select></div></div>' +
      '<div class="v6-row sticky"><button type="button" class="btn dark" data-act="v6ThemeSave"' + (dirty && !blocked ? '' : ' disabled') + '>Enregistrer l\'apparence</button><button type="button" class="btn ghost" data-act="v6ThemeCancel"' + (dirty ? '' : ' disabled') + '>Annuler les changements</button><button type="button" class="btn ghost" data-act="v6ThemeOriginal">Revenir à l\'original</button>' + (dirty ? '<span class="v6-badge warn">non enregistré (aperçu en direct)</span>' : '<span class="v6-badge ok">' + h(V6.syncLabel('mgr_theme') || 'Enregistré') + '</span>') + '</div>' +
      '<h3 class="se-h">Animations du gestionnaire</h3><div class="v6-presets">' + anim + '</div><div class="field v6-speed"><label for="v6-spd">Vitesse globale : <b>×' + h(an.speed) + '</b></label><input type="range" id="v6-spd" min="0.5" max="2.5" step="0.1" value="' + h(an.speed) + '" data-v6s="speed"></div><div class="v6-arows">' + rows + '</div><p class="hint">Les animations sont désactivées automatiquement si votre appareil demande « moins d\'animations », ou via PARAMÈTRES › Préférences.</p>';
  }
  function liveTheme(){ var st = document.getElementById('v6-theme'); if(st){ var pr = V6.cfg.mgr_prefs; st.textContent = V6.themeCss(td()) + (pr.density === 'compact' ? '\nbody{font-size:12.5px}' : pr.density === 'large' ? '\nbody{font-size:15px}' : ''); } }
  Object.assign(ACT_EXTRA, {
    v6Preset: function(k){ var t = td(); t.preset = k; t.colors = {}; liveTheme(); V6.rerender(); },
    v6ThemeSave: async function(){ var t = td(); if(checks(t).some(function(x){ return x.lvl === 'bad'; })) return toast('Contraste insuffisant.', 'err'); var r = await V6.save('mgr_theme', cl(t)); V6.TD = null; toast(r.ok ? 'Apparence du gestionnaire enregistrée (' + (r.where === 'server' ? 'serveur' : 'cet appareil') + ').' : 'Enregistrée localement ; erreur serveur : ' + h(r.error), r.ok ? '' : 'err'); V6.rerender(); },
    v6ThemeCancel: function(){ V6.TD = null; V6.applyAll(); V6.rerender(); },
    v6ThemeOriginal: async function(){ if(!await confirmDlg('Revenir à l\'original', 'Rétablir l\'apparence d\'origine du gestionnaire ?', 'Rétablir', 'dark')) return; V6.TD = null; await V6.save('mgr_theme', { preset: 'classic', dark: false, colors: {}, radius: null, font: null, sidebar: null, btn: null }); toast('Apparence d\'origine rétablie.'); V6.rerender(); },
    v6AnimStyle: async function(k){ var st = STYLES[k]; var r = await V6.save('mgr_anim', { style: k, speed: st.speed, apply: cl(st.apply) }); toast('Style « ' + st.name + ' » appliqué.'); V6.rerender(); }
  });
  document.addEventListener('input', function(e){
    var t = e.target, k = t.dataset && t.dataset.v6s; if(!k) return;
    if(k === 'color'){ var d = td(); d.colors = d.colors || {}; d.colors[t.dataset.k] = t.value; var cd = t.parentNode.querySelector('code'); if(cd) cd.textContent = t.value; liveTheme(); clearTimeout(V6._ct); V6._ct = setTimeout(V6.rerender, 400); }
    else if(k === 'radius'){ td().radius = Number(t.value); var lb = t.parentNode.querySelector('b'); if(lb) lb.textContent = t.value + ' px'; liveTheme(); }
    else if(k === 'speed'){ var lb2 = t.parentNode.querySelector('b'); if(lb2) lb2.textContent = '×' + t.value; clearTimeout(V6._st); V6._st = setTimeout(function(){ V6.save('mgr_anim', Object.assign({}, V6.cfg.mgr_anim, { speed: Number(t.value) })); }, 400); }
  });
  document.addEventListener('change', function(e){
    var t = e.target, k = t.dataset && t.dataset.v6s; if(!k) return;
    if(k === 'dark'){ td().dark = t.checked; liveTheme(); V6.rerender(); }
    else if(k === 'btn' || k === 'font' || k === 'sidebar'){ td()[k] = t.value || null; liveTheme(); V6.rerender(); }
    else if(k === 'manim' || k === 'mdur'){ var an = cl(V6.cfg.mgr_anim); an.apply = an.apply || {}; var a = an.apply[t.dataset.t] = an.apply[t.dataset.t] || { dur: .5 };
      if(k === 'manim'){ if(!t.value) delete an.apply[t.dataset.t]; else { a.anim = t.value; var it = byId(t.value); if(it && !a.dur) a.dur = it.dur; } } else a.dur = V6.clampN(t.value, .5, .1, 5);
      an.style = 'custom'; V6.save('mgr_anim', an).then(function(){ V6.rerender(); }); }
  });

  /* ===================== STUDIO : SITE WEB ===================== */
  var SITE_TARGET_LABELS = { hero: 'Texte du Hero (au chargement)', reveal: 'Apparition des sections (au défilement)', cards: 'Cartes produits (au chargement)', cardHover: 'Cartes produits (au survol)', buttons: 'Boutons (au survol)', images: 'Images produits (au survol)' };
  function siteState(){
    var d = JSON.stringify([D().theme || {}, D().animApply || {}, D().motion || {}]), p = JSON.stringify([S.published.theme || {}, S.published.animApply || {}, S.published.motion || {}]);
    return d === p ? ['Publié — identique au site public', 'ok'] : ['Brouillon — non publié', 'warn'];
  }
  function siteTab(){
    var st = siteState(), ap = D().animApply || {}, lib = V6.libAll().filter(function(x){ return !x.disabled; });
    var rows = Object.keys(SITE_TARGET_LABELS).map(function(k){
      var a = ap[k] || {}, it = a.anim ? byId(a.anim) : null;
      return '<div class="v6-card"><div class="v6-card-h"><b>' + h(SITE_TARGET_LABELS[k]) + '</b>' + (a.anim ? '<span class="v6-badge warn">' + h(it ? it.name : a.anim) + '</span>' : '<span class="v6-badge">d\'origine</span>') + '</div><div class="form-grid"><div class="field"><label>Animation</label><select data-v6s="sanim" data-t="' + k + '"><option value="">Animation d\'origine du site</option>' + CATS.concat(['Personnalisées']).map(function(c){ var g = lib.filter(function(x){ return x.cat === c; }); return g.length ? '<optgroup label="' + h(c) + '">' + g.map(function(x){ return '<option value="' + h(x.id) + '"' + (a.anim === x.id ? ' selected' : '') + '>' + h(x.name) + '</option>'; }).join('') + '</optgroup>' : ''; }).join('') + '</select></div>' +
        (a.anim ? '<div class="field"><label>Durée : <b>' + h(a.dur || .6) + ' s</b></label><input type="range" min="0.1" max="3" step="0.05" value="' + h(a.dur || .6) + '" data-v6s="sdur" data-t="' + k + '"></div><div class="field"><label>Intensité : <b>' + h(a.int || 1) + '</b></label><input type="range" min="0.2" max="2" step="0.1" value="' + h(a.int || 1) + '" data-v6s="sint" data-t="' + k + '"></div><div class="field"><label>Retard : <b>' + h(a.delay || 0) + ' s</b></label><input type="range" min="0" max="2" step="0.05" value="' + h(a.delay || 0) + '" data-v6s="sdel" data-t="' + k + '"></div><div class="field"><label>Courbe</label><select data-v6s="sease" data-t="' + k + '">' + SLX_ANIM_EASES.map(function(e){ return '<option' + (a.ease === e ? ' selected' : '') + '>' + h(e) + '</option>'; }).join('') + '</select></div>' : '') + '</div></div>';
    }).join('');
    return '<div class="v6-sub">Apparence du <b>site public</b>. Vos changements restent un <b>brouillon</b> (aperçu ci-dessous) jusqu\'au clic sur « Publier » : rien n\'est publié automatiquement. <span class="v6-badge ' + st[1] + '">' + h(st[0]) + '</span></div>' +
      '<div class="v6-site">' + (typeof viewAppearance === 'function' ? viewAppearance() : '') + '</div>' +
      '<h3 class="se-h">Animations personnalisées du site</h3><p class="hint" style="margin-top:0">Choisissez une animation de la bibliothèque pour chaque zone. L\'aperçu se met à jour en direct. Elles sont ignorées pour les visiteurs qui demandent « moins d\'animations ».</p>' + rows +
      '<div class="v6-row sticky"><button type="button" class="btn" data-act="v6SiteSave">Enregistrer le brouillon</button><button type="button" class="btn gold" data-act="v6SitePublish">Publier l\'apparence et les animations</button><button type="button" class="btn ghost" data-act="v6SiteResetAnim">Retirer mes animations (brouillon)</button></div>';
  }
  function cleanSiteLib(){ var ap = D().animApply || {}, used = {}; Object.keys(ap).forEach(function(k){ used[ap[k].anim] = 1; }); D().animLib = (D().animLib || []).filter(function(x){ return used[x.id]; }); if(!D().animLib.length) delete D().animLib; if(!Object.keys(ap).length) delete D().animApply; }
  function siteAssign(t, id, patch){
    var d = D(); d.animApply = d.animApply || {}; d.animLib = d.animLib || [];
    if(!id){ delete d.animApply[t]; cleanSiteLib(); return; }
    var it = byId(id); if(!it) return;
    if(!d.animLib.some(function(x){ return x.id === id; })) d.animLib.push({ id: it.id, name: it.name, css: it.css });
    var a = d.animApply[t] = Object.assign({ anim: id, dur: it.dur || .6, int: 1, delay: 0, ease: it.ease || 'ease', on: true }, d.animApply[t] && d.animApply[t].anim === id ? d.animApply[t] : {}, patch || {}); a.anim = id;
    if(d.animLib.length > 60) d.animLib.length = 60;
  }
  V6.siteAssign = siteAssign;
  V6.publishSite = async function(){
    if(!await confirmDlg('Publier sur le site public', 'L\'apparence et les animations du brouillon seront visibles par tous les visiteurs. Continuer ?', 'Publier', 'dark')) return;
    cleanSiteLib(); await persist();
    await publishPart(function(p){ p.theme = cl(D().theme || {}); AP_TEXT_KEYS.forEach(function(k){ p.home[k] = cl(D().home[k]); }); var order = D().products.map(function(x){ return x.id; }); p.products.sort(function(a, b){ var i = order.indexOf(a.id), j = order.indexOf(b.id); return (i < 0 ? 1e9 : i) - (j < 0 ? 1e9 : j); });
      if(D().animApply){ p.animApply = cl(D().animApply); p.animLib = cl(D().animLib || []); } else { delete p.animApply; delete p.animLib; }
      if(D().motion && Object.keys(D().motion).length) p.motion = cl(D().motion); else delete p.motion; }, 'Apparence et animations publiées');
    V6.rerender();
  };
  Object.assign(ACT_EXTRA, {
    v6SiteSave: async function(){ cleanSiteLib(); AP.dirtyLocal = false; await commit('Brouillon du site enregistré (non publié).'); V6.rerender(); },
    v6SitePublish: function(){ return V6.publishSite(); },
    v6SiteResetAnim: async function(){ delete D().animApply; delete D().animLib; await commit('Animations retirées du brouillon (non publié).'); V6.rerender(); }
  });
  var _tab = ACT_EXTRA.apTab, _pub = ACT_EXTRA.apPublish;
  if(_tab) ACT_EXTRA.apTab = function(a){ if(UI.view === 'studio'){ AP.tab = a; V6.rerender(); return; } return _tab.apply(this, arguments); };
  if(_pub) ACT_EXTRA.apPublish = function(){ if(UI.view === 'studio') return V6.publishSite(); return _pub.apply(this, arguments); };
  document.addEventListener('input', function(e){
    var t = e.target, k = t.dataset && t.dataset.v6s; if(!k || !/^s(dur|int|del)$/.test(k)) return;
    var map = { sdur: 'dur', sint: 'int', sdel: 'delay' }, tg = t.dataset.t, a = (D().animApply || {})[tg]; if(!a) return;
    a[map[k]] = Number(t.value); var lb = t.parentNode.querySelector('b'); if(lb) lb.textContent = t.value + (k === 'sint' ? '' : ' s'); if(typeof apSendSoon === 'function') apSendSoon();
  });
  document.addEventListener('change', function(e){
    var t = e.target, k = t.dataset && t.dataset.v6s; if(k === 'sanim'){ siteAssign(t.dataset.t, t.value); V6.rerender(); if(typeof apSendSoon === 'function') apSendSoon(); }
    else if(k === 'sease'){ var a = (D().animApply || {})[t.dataset.t]; if(a){ a.ease = t.value; if(typeof apSendSoon === 'function') apSendSoon(); } }
  });

  /* ===================== BIBLIOTHÈQUE ET CRÉATION ===================== */
  V6.L = { cat: '', q: '', dur: null, int: 1 };
  function libTab(){
    var L = V6.L, all = V6.libAll(), qq = L.q.trim().toLowerCase();
    var list = all.filter(function(x){ return (!L.cat || x.cat === L.cat) && (!qq || (x.name + ' ' + x.cat).toLowerCase().indexOf(qq) >= 0); });
    var cats = ['', ].concat(CATS, ['Personnalisées']);
    var used = function(x){ var u = []; var ma = V6.cfg.mgr_anim.apply || {}; Object.keys(ma).forEach(function(k){ if(ma[k].anim === x.id) u.push('Gestionnaire'); }); var sa = D().animApply || {}, pa = S.published.animApply || {}; Object.keys(sa).forEach(function(k){ if(sa[k].anim === x.id) u.push('Site (brouillon)'); }); Object.keys(pa).forEach(function(k){ if(pa[k].anim === x.id) u.push('Site (publié)'); }); return Array.from(new Set(u)); };
    var cards = list.map(function(x){
      var custom = !x.builtin;
      return '<div class="v6-lcard' + (x.disabled ? ' off' : '') + '"><div class="v6-demo" data-demo="' + h(x.id) + '"><i>Aa</i></div><div class="v6-lmeta"><b>' + h(x.name) + '</b><small>' + h(x.cat) + ' · ' + h(x.dur || .6) + ' s' + (x.disabled ? ' · désactivée' : '') + '</small>' + used(x).map(function(u){ return '<span class="v6-badge ok">' + h(u) + '</span>'; }).join('') + '</div><div class="v6-lact"><button type="button" class="btn ghost" data-act="v6Test" data-arg="' + h(x.id) + '">▶ Tester</button><button type="button" class="btn" data-act="v6Use" data-arg="' + h(x.id) + '">Utiliser</button>' + (custom ? '<button type="button" class="btn ghost" data-act="v6Edit" data-arg="' + h(x.id) + '">Modifier</button>' : '<button type="button" class="btn ghost" data-act="v6Dup" data-arg="' + h(x.id) + '">Dupliquer</button>') + (custom ? '<button type="button" class="btn ghost" data-act="v6Dup" data-arg="' + h(x.id) + '">Dupliquer</button><button type="button" class="btn ghost" data-act="v6Toggle" data-arg="' + h(x.id) + '">' + (x.disabled ? 'Activer' : 'Désactiver') + '</button><button type="button" class="btn ghost danger" data-act="v6Del" data-arg="' + h(x.id) + '">Supprimer</button>' : '') + '</div></div>';
    }).join('') || '<p class="muted">Aucune animation.</p>';
    return '<div class="v6-row"><button type="button" class="btn dark" data-act="v6New">+ Créer une animation</button><input type="search" class="v6-q" id="v6lq" placeholder="Rechercher…" value="' + h(L.q) + '" data-v6s="lq"></div><div class="v6-cats">' + cats.map(function(c){ return '<button type="button" class="' + (L.cat === c ? 'on' : '') + '" data-act="v6Cat" data-arg="' + h(c) + '">' + (c || 'Toutes') + '</button>'; }).join('') + '</div>' +
      '<div class="v6-tctl"><div class="field"><label>Intensité du test : <b>' + h(L.int) + '</b></label><input type="range" min="0.2" max="2" step="0.1" value="' + h(L.int) + '" data-v6s="lint"></div></div><div class="v6-lgrid">' + cards + '</div><p class="hint">« Tester » joue l\'animation sur l\'exemple. « Utiliser » l\'applique au gestionnaire, au site (brouillon) ou la conserve dans la bibliothèque.</p>';
  }
  document.addEventListener('input', function(e){ var t = e.target, k = t.dataset && t.dataset.v6s; if(k === 'lq'){ V6.L.q = t.value; clearTimeout(V6._lt); V6._lt = setTimeout(function(){ V6.rerender(); var el = document.getElementById('v6lq'); if(el){ el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 200); } else if(k === 'lint'){ V6.L.int = Number(t.value); var lb = t.parentNode.querySelector('b'); if(lb) lb.textContent = t.value; } });
  function sid(name){ return 'c-' + (String(name).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'anim') + '-' + Math.random().toString(36).slice(2, 6); }
  function saveLib(list){ return V6.save('mgr_animlib', list.slice(0, 60)); }
  Object.assign(ACT_EXTRA, {
    v6Cat: function(a){ V6.L.cat = a; V6.rerender(); },
    v6Test: function(a){ var el = q('.v6-demo[data-demo="' + a + '"] i'); V6.play(el, byId(a), { int: V6.L.int }) || toast('Animation invalide.', 'err'); },
    v6Use: function(a){ useDialog(byId(a)); },
    v6Dup: async function(a){ var it = byId(a); if(!it) return; var list = cl(V6.cfg.mgr_animlib || []); if(list.length >= 60) return toast('60 animations personnalisées maximum.', 'err'); var n = { id: sid(it.name), name: it.name + ' (copie)', cat: 'Personnalisées', css: it.css.replace(/@keyframes\s+[a-zA-Z0-9_-]+/, '@keyframes ' + sid('copie').replace(/^c-/, 'k')), dur: it.dur, ease: it.ease, int: it.int || 1, created: nowIso() }; list.push(n); await saveLib(list); toast('Copie créée dans votre bibliothèque.'); V6.rerender(); },
    v6Toggle: async function(a){ var list = cl(V6.cfg.mgr_animlib || []), it = list.find(function(x){ return x.id === a; }); if(!it) return; it.disabled = !it.disabled; await saveLib(list); V6.rerender(); },
    v6Del: async function(a){ var it = byId(a); if(!it || !await confirmDlg('Supprimer l\'animation', 'Supprimer « ' + h(it.name) + ' » de votre bibliothèque ? Les zones qui l\'utilisent reviendront à l\'animation d\'origine.', 'Supprimer', 'danger')) return;
      await saveLib((V6.cfg.mgr_animlib || []).filter(function(x){ return x.id !== a; }));
      var an = cl(V6.cfg.mgr_anim); Object.keys(an.apply || {}).forEach(function(k){ if(an.apply[k].anim === a) delete an.apply[k]; }); await V6.save('mgr_anim', an);
      var ap = D().animApply || {}; Object.keys(ap).forEach(function(k){ if(ap[k].anim === a) delete ap[k]; }); cleanSiteLib(); await persist(); toast('Animation supprimée.'); V6.rerender(); },
    v6New: function(){ editor(null); },
    v6Edit: function(a){ editor(byId(a)); }
  });

  /* ----- « Utiliser » : choisir la destination ----- */
  function useDialog(it){
    if(!it) return;
    var mt = Object.keys(V6.MGR_TARGETS).map(function(k){ return '<option value="' + k + '">' + h(V6.MGR_TARGET_LABELS[k]) + '</option>'; }).join(''), st = Object.keys(SITE_TARGET_LABELS).map(function(k){ return '<option value="' + k + '">' + h(SITE_TARGET_LABELS[k]) + '</option>'; }).join('');
    var m = openModal({ title: 'Utiliser « ' + it.name + ' »', body: '<div class="v6-dest"><div class="v6-card"><b>Dans le gestionnaire</b><select id="v6-mt">' + mt + '</select><button type="button" class="btn dark" id="v6-gm">Appliquer au gestionnaire</button></div><div class="v6-card"><b>Sur le site web</b><p class="hint">Va dans le <b>brouillon</b> du site : il faudra publier explicitement.</p><select id="v6-st">' + st + '</select><button type="button" class="btn gold" id="v6-gs">Ajouter au brouillon du site</button></div></div>', foot: '<button type="button" class="btn ghost" data-close>Fermer</button>' });
    q('#v6-gm', m.wrap).onclick = async function(){ var an = cl(V6.cfg.mgr_anim); an.apply = an.apply || {}; an.apply[q('#v6-mt', m.wrap).value] = { anim: it.id, dur: it.dur || .5, int: 1 }; an.style = 'custom'; await V6.save('mgr_anim', an); requestClose(m); toast('Animation appliquée au gestionnaire.'); V6.rerender(); };
    q('#v6-gs', m.wrap).onclick = async function(){ siteAssign(q('#v6-st', m.wrap).value, it.id); await persist(); refreshChrome(); requestClose(m); toast('Ajoutée au brouillon du site (non publiée). Rendez-vous dans SITE WEB pour l\'aperçu et la publication.'); V6.rerender(); };
  }

  /* ----- création / édition ----- */
  function genCss(f, name){
    var from = ['opacity:' + f.o0], tf = [];
    if(f.x) tf.push('translateX(calc(' + f.x + 'px*var(--v6-i,1)))'); if(f.y) tf.push('translateY(calc(' + f.y + 'px*var(--v6-i,1)))');
    if(f.s !== 1) tf.push('scale(calc(1 + ' + (f.s - 1).toFixed(3) + '*var(--v6-i,1)))'); if(f.r) tf.push('rotate(calc(' + f.r + 'deg*var(--v6-i,1)))');
    if(tf.length) from.push('transform:' + tf.join(' ')); if(f.b) from.push('filter:blur(calc(' + f.b + 'px*var(--v6-i,1)))');
    var to = ['opacity:1']; if(tf.length) to.push('transform:none'); if(f.b) to.push('filter:blur(0)');
    var mid = f.bounce && tf.length ? '70%{opacity:1;transform:scale(1.04)}' : '';
    return '@keyframes ' + name + '{from{' + from.join(';') + '}' + mid + 'to{' + to.join(';') + '}}';
  }
  function editor(it){
    var edit = !!(it && !it.builtin), mode = 'wizard';
    var f = { o0: 0, x: 0, y: 20, s: 1, r: 0, b: 0, bounce: false };
    var base = { name: it ? (edit ? it.name : it.name + ' (copie)') : '', cat: 'Personnalisées', dur: it ? it.dur : .6, ease: it ? it.ease : 'ease', int: it ? it.int || 1 : 1, css: it ? it.css : genCss(f, 'ma-animation') };
    var m = openModal({ size: 'lg', title: edit ? 'Modifier l\'animation' : 'Créer une animation', body:
      '<div class="v6-editing"><div class="form-grid"><div class="field full"><label for="v6e-n">Nom</label><input id="v6e-n" maxlength="40" value="' + h(base.name) + '" placeholder="Ex. : Entrée dorée"></div><div class="field"><label for="v6e-d">Durée (s)</label><input type="number" id="v6e-d" min="0.1" max="5" step="0.05" value="' + h(base.dur) + '"></div><div class="field"><label for="v6e-e">Courbe</label><select id="v6e-e">' + SLX_ANIM_EASES.map(function(x){ return '<option' + (x === base.ease ? ' selected' : '') + '>' + h(x) + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="v6-tabs sm"><button type="button" class="on" data-m="wizard">Assistant</button><button type="button" data-m="code">Code CSS</button></div>' +
      '<div id="v6e-wiz" class="form-grid"><div class="field"><label>Opacité de départ</label><input type="number" id="v6w-o" min="0" max="1" step="0.1" value="0"></div><div class="field"><label>Décalage horizontal (px)</label><input type="number" id="v6w-x" value="0"></div><div class="field"><label>Décalage vertical (px)</label><input type="number" id="v6w-y" value="20"></div><div class="field"><label>Échelle de départ</label><input type="number" id="v6w-s" min="0.2" max="2" step="0.05" value="1"></div><div class="field"><label>Rotation (°)</label><input type="number" id="v6w-r" value="0"></div><div class="field"><label>Flou de départ (px)</label><input type="number" id="v6w-b" min="0" max="30" value="0"></div><label class="v6-switch"><input type="checkbox" id="v6w-bo"> Léger rebond à l\'arrivée</label></div>' +
      '<div id="v6e-code" hidden><div class="field full"><label for="v6e-css">Code @keyframes (seules les propriétés d\'animation sûres sont acceptées)</label><textarea id="v6e-css" rows="9" spellcheck="false" class="v6-mono">' + h(base.css) + '</textarea></div><div class="v6-row"><button type="button" class="btn ghost" id="v6e-val">Valider le code</button></div></div>' +
      '<p id="v6e-msg" class="v6-msg" aria-live="polite"></p><div class="v6-demo big"><i>Aperçu</i></div><div class="v6-row"><button type="button" class="btn ghost" id="v6e-play">▶ Tester</button></div>' +
      '<h4 class="v6-h4">Enregistrer</h4><div class="v6-dest"><div class="v6-card"><b>Gestionnaire</b><select id="v6e-mt">' + Object.keys(V6.MGR_TARGETS).map(function(k){ return '<option value="' + k + '">' + h(V6.MGR_TARGET_LABELS[k]) + '</option>'; }).join('') + '</select><button type="button" class="btn dark" id="v6e-sm">ENREGISTRER DANS LE GESTIONNAIRE</button></div><div class="v6-card"><b>Site web</b><select id="v6e-st">' + Object.keys(SITE_TARGET_LABELS).map(function(k){ return '<option value="' + k + '">' + h(SITE_TARGET_LABELS[k]) + '</option>'; }).join('') + '</select><button type="button" class="btn gold" id="v6e-ss">ENREGISTRER SUR LE SITE WEB</button><small class="hint">Brouillon : publication explicite requise.</small></div><div class="v6-card"><b>Bibliothèque</b><p class="hint" style="margin:0">Conserver sans l\'appliquer.</p><button type="button" class="btn" id="v6e-sl">ENREGISTRER DANS LA BIBLIOTHÈQUE</button></div></div></div>', foot: '<button type="button" class="btn ghost" data-close>Fermer</button>' });
    var w = m.wrap, g = function(i){ return q(i, w); };
    if(edit && it) mode = 'code';
    function setMode(x){ mode = x; g('#v6e-wiz').hidden = x !== 'wizard'; g('#v6e-code').hidden = x !== 'code'; w.querySelectorAll('.v6-tabs.sm button').forEach(function(b){ b.classList.toggle('on', b.dataset.m === x); }); }
    setMode(mode);
    w.querySelectorAll('.v6-tabs.sm button').forEach(function(b){ b.onclick = function(){ if(b.dataset.m === 'code' && mode === 'wizard') g('#v6e-css').value = wiz(); setMode(b.dataset.m); }; });
    function wiz(){ f = { o0: V6.clampN(g('#v6w-o').value, 0, 0, 1), x: V6.clampN(g('#v6w-x').value, 0, -400, 400), y: V6.clampN(g('#v6w-y').value, 0, -400, 400), s: V6.clampN(g('#v6w-s').value, 1, .2, 2), r: V6.clampN(g('#v6w-r').value, 0, -360, 360), b: V6.clampN(g('#v6w-b').value, 0, 0, 30), bounce: g('#v6w-bo').checked }; return genCss(f, 'ma-animation'); }
    function cur(){
      var name = g('#v6e-n').value.trim(), css = mode === 'wizard' ? wiz() : g('#v6e-css').value, msg = g('#v6e-msg');
      if(name.length < 2){ msg.className = 'v6-msg bad'; msg.textContent = 'Donnez un nom (2 caractères minimum).'; return null; }
      var v = SLX_ANIM_VALIDATE(css, { prefix: 'slx6-' });
      if(!v.ok){ msg.className = 'v6-msg bad'; msg.innerHTML = '✕ ' + v.errors.map(h).join('<br>✕ '); return null; }
      msg.className = 'v6-msg ok'; msg.textContent = '✓ Code valide et sûr (' + v.names.length + ' animation' + (v.names.length > 1 ? 's' : '') + ').';
      return { id: edit ? it.id : sid(name), name: name, cat: 'Personnalisées', css: css, dur: V6.clampN(g('#v6e-d').value, .6, .1, 5), ease: g('#v6e-e').value, int: 1, created: edit ? it.created : nowIso(), updated: nowIso() };
    }
    g('#v6e-val').onclick = cur;
    g('#v6e-play').onclick = function(){ var x = cur(); if(x) V6.play(g('.v6-demo.big i'), x, { int: 1 }); };
    async function toLib(x){ var list = cl(V6.cfg.mgr_animlib || []), i = list.findIndex(function(y){ return y.id === x.id; }); if(i < 0 && list.length >= 60){ toast('60 animations personnalisées maximum.', 'err'); return false; } if(i >= 0) list[i] = x; else list.push(x); var r = await saveLib(list); if(!r.ok) toast('Enregistrée sur cet appareil ; erreur serveur : ' + h(r.error), 'err'); return true; }
    g('#v6e-sl').onclick = async function(){ var x = cur(); if(!x || !await toLib(x)) return; requestClose(m); toast('Animation enregistrée dans la bibliothèque.'); V6.rerender(); };
    g('#v6e-sm').onclick = async function(){ var x = cur(); if(!x || !await toLib(x)) return; var an = cl(V6.cfg.mgr_anim); an.apply = an.apply || {}; an.apply[g('#v6e-mt').value] = { anim: x.id, dur: x.dur, ease: x.ease, int: 1 }; an.style = 'custom'; await V6.save('mgr_anim', an); requestClose(m); toast('Enregistrée et appliquée au gestionnaire.'); V6.rerender(); };
    g('#v6e-ss').onclick = async function(){ var x = cur(); if(!x) return; var d = D(); d.animLib = d.animLib || []; var j = d.animLib.findIndex(function(y){ return y.id === x.id; }); var rec = { id: x.id, name: x.name, css: x.css }; if(j >= 0) d.animLib[j] = rec; else d.animLib.push(rec); siteAssign(g('#v6e-st').value, x.id, { dur: x.dur, ease: x.ease }); await persist(); refreshChrome(); requestClose(m); toast('Enregistrée dans le brouillon du site (non publiée). Publiez depuis SITE WEB.'); V6.rerender(); };
  }

  /* ===================== PUBLIC : aperçu enrichi ===================== */
  V6.pubJs = '';
  Promise.all(['anim-validate.js', 'motion.js', 'public-apply.js'].map(function(f){ return fetch('v6/' + f, { cache: 'no-store' }).then(function(r){ return r.ok ? r.text() : ''; }); })).then(function(a){ V6.pubJs = a.join('\n'); }).catch(function(){});
  var _pv = window.previewHtml;
  if(typeof _pv === 'function') window.previewHtml = function(){ var html = _pv.apply(this, arguments); if(!V6.pubJs || typeof html !== 'string' || /id="slx-v6-public"/.test(html)) return html; var i = html.lastIndexOf('</body>'); var tag = '<script id="slx-v6-public">' + V6.pubJs.replace(/<\/script/gi, '<\\/script') + '<\/script>'; return i < 0 ? html + tag : html.slice(0, i) + tag + html.slice(i); };

  V6.studioBody = function(tab){ return tab === 'site' ? siteTab() : tab === 'library' ? libTab() : mgrTab(); };
  V6.afterRender = function(view, tab){ if(view === 'studio' && tab === 'library'){ /* démos prêtes */ } };
})();
