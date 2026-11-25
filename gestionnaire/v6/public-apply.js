/* SEN LUXE v6 — côté site public : intégrations (avec consentement) + animations personnalisées.
 * Source unique : insérée dans index.html (et dans l'aperçu du gestionnaire) par scripts/sync-v6.py.
 * Sans `integrations` ni `animApply` dans la publication, ce code ne fait RIEN : le site reste identique. */
(function(){
  'use strict';
  var TARGETS = {
    hero:      { sel: '.hero-inner' },
    reveal:    { sel: '.reveal.in' },
    cards:     { sel: '#productGrid > .product-card' },
    cardHover: { sel: '.product-card:hover' },
    buttons:   { sel: '.btn-primary:hover,.btn-secondary:hover,.qv-addbtn:hover' },
    images:    { sel: '.product-card:hover .product-media img' }
  };
  Object.keys(TARGETS).forEach(function(k){ TARGETS[k].off = 1; });
  window.SLX_V6_PUBLIC_TARGETS = TARGETS;

  function applyAnim(p){
    var st = document.getElementById('slx-v6-anim');
    if(!p || !p.animApply || typeof p.animApply !== 'object' || !Object.keys(p.animApply).length || typeof window.SLX_ANIM_BUILD !== 'function'){ if(st) st.remove(); return; }
    var css = window.SLX_ANIM_BUILD(p.animLib, p.animApply, TARGETS);
    if(!st){ st = document.createElement('style'); st.id = 'slx-v6-anim'; document.head.appendChild(st); }
    st.textContent = css;
  }

  /* ---------- intégrations ---------- */
  var DEFS = {
    metaPixel: { cat: 'marketing', re: /^[0-9]{6,20}$/ },
    ga4:       { cat: 'analytics', re: /^G-[A-Z0-9]{4,14}$/ },
    gtm:       { cat: 'analytics', re: /^GTM-[A-Z0-9]{4,10}$/ },
    gads:      { cat: 'marketing', re: /^AW-[0-9]{6,14}$/ },
    tiktok:    { cat: 'marketing', re: /^[A-Z0-9]{8,30}$/ },
    pinterest: { cat: 'marketing', re: /^[0-9]{8,20}$/ }
  };
  var LOADED = {};
  function readConsent(){ try{ return JSON.parse(localStorage.getItem('slx_consent_v6') || 'null'); }catch(e){ return null; } }
  function saveConsent(c){ try{ localStorage.setItem('slx_consent_v6', JSON.stringify(c)); }catch(e){} }
  function addScript(src, id){ if(document.getElementById(id)) return; var s = document.createElement('script'); s.async = true; s.src = src; s.id = id; document.head.appendChild(s); }
  function gtagInit(id){
    window.dataLayer = window.dataLayer || []; if(!window.gtag) window.gtag = function(){ window.dataLayer.push(arguments); };
    window.gtag('js', new Date()); window.gtag('config', id);
  }
  var LOADERS = {
    ga4: function(id){ addScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id), 'slx6-ga4'); gtagInit(id); },
    gads: function(id){ addScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id), 'slx6-gads'); gtagInit(id); },
    gtm: function(id){ window.dataLayer = window.dataLayer || []; window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' }); addScript('https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(id), 'slx6-gtm'); },
    metaPixel: function(id){
      if(!window.fbq){ var n = window.fbq = function(){ n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if(!window._fbq) window._fbq = n; n.push = n; n.loaded = true; n.version = '2.0'; n.queue = []; }
      addScript('https://connect.facebook.net/en_US/fbevents.js', 'slx6-fb'); window.fbq('init', id); window.fbq('track', 'PageView');
    },
    tiktok: function(id){
      var w = window, t = 'ttq'; w[t] = w[t] || []; var q = w[t]; if(!q.methods){ q.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie'];
        q.setAndDefer = function(o, m){ o[m] = function(){ o.push([m].concat([].slice.call(arguments, 0))); }; }; q.methods.forEach(function(m){ q.setAndDefer(q, m); }); }
      addScript('https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=' + encodeURIComponent(id) + '&lib=ttq', 'slx6-tt'); q.push(['page']);
    },
    pinterest: function(id){
      if(!window.pintrk){ var p = window.pintrk = function(){ p.queue.push([].slice.call(arguments)); }; p.queue = []; p.version = '3.0'; }
      addScript('https://s.pinimg.com/ct/core.js', 'slx6-pin'); window.pintrk('load', id); window.pintrk('page');
    }
  };
  function runIntegrations(ig, consent){
    Object.keys(DEFS).forEach(function(k){
      var it = ig[k]; if(!it || !it.enabled || LOADED[k]) return;
      var id = String(it.id || '').trim(); if(!DEFS[k].re.test(id)) return;
      if(ig.requireConsent !== false && !(consent && consent[DEFS[k].cat])) return;
      try{ LOADERS[k](id); LOADED[k] = 1; }catch(e){}
    });
  }
  function banner(ig){
    if(document.getElementById('slx6-consent')) return;
    var d = document.createElement('div'); d.id = 'slx6-consent'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Préférences de confidentialité');
    d.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;max-width:520px;margin:0 auto;z-index:2147483000;background:#0a0a0a;color:#fff;padding:16px 18px;border:1px solid #d4af37;font:13px/1.5 Montserrat,system-ui,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.35)';
    d.innerHTML = '<p style="margin:0 0 12px">Nous utilisons des outils de mesure et de publicité pour améliorer votre expérience. Vous pouvez les accepter ou les refuser.</p><div style="display:flex;gap:8px;flex-wrap:wrap"></div>';
    function mk(t, v, gold){ var b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.style.cssText = 'flex:1 1 120px;padding:11px 14px;cursor:pointer;font:600 11px Montserrat,system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;border:1px solid #d4af37;' + (gold ? 'background:#d4af37;color:#0a0a0a' : 'background:transparent;color:#fff');
      b.onclick = function(){ var c = { analytics: v, marketing: v, ts: Date.now() }; saveConsent(c); d.remove(); runIntegrations(ig, c); }; d.lastChild.appendChild(b); }
    mk('Refuser', false, false); mk('Accepter', true, true); document.body.appendChild(d);
  }
  function applyIntegrations(p){
    var ig = p && p.integrations; if(!ig || typeof ig !== 'object') return;
    var any = Object.keys(DEFS).some(function(k){ return ig[k] && ig[k].enabled && DEFS[k].re.test(String(ig[k].id || '').trim()); });
    if(!any) return;
    var c = readConsent();
    if(ig.requireConsent !== false && !c){ banner(ig); return; }
    runIntegrations(ig, c);
  }

  var lastMotion = null;
  function applyMotion(p){
    var m = p && p.motion && typeof p.motion === 'object' ? p.motion : null, key = JSON.stringify(m || null);
    if(key === lastMotion) return; lastMotion = key;
    if(!window.SLX_MOTION) return;
    if(!m || !Object.keys(m).length){ SLX_MOTION.uninstall(); return; }
    SLX_MOTION.install(m, SLX_MOTION.TARGETS.public);
  }
  window.slxV6Apply = function(p){ try{ applyMotion(p); }catch(e){} try{ applyAnim(p); }catch(e){} try{ if(window.parent === window) applyIntegrations(p); }catch(e){} };
  if(window.parent !== window){
    window.addEventListener('message', function(e){ if(e.source !== window.parent) return; var m = e.data; if(m && m.type === 'senluxe-preview' && m.payload) window.slxV6Apply(m.payload); });
  }
})();
