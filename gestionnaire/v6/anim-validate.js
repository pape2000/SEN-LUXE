/* SEN LUXE v6 — Validateur d'animations CSS (partagé gestionnaire / site public).
 * Principe : on n'accepte QUE des blocs @keyframes composés de propriétés autorisées, puis on RECONSTRUIT le CSS
 * à partir de ce qui a été compris. Rien n'est recopié tel quel. Aucun JavaScript, aucun sélecteur libre,
 * aucune URL, aucun @import. Une copie identique est insérée dans index.html (site public) : ne modifier
 * qu'ici puis relancer scripts/sync-validator.py. */
(function(root){
  'use strict';
  var PROPS = {
    'opacity':'num', 'transform':'fn', 'transform-origin':'txt', 'filter':'fn', 'box-shadow':'txt', 'text-shadow':'txt',
    'background-position':'txt', 'color':'color', 'background-color':'color', 'border-color':'color', 'outline-color':'color',
    'letter-spacing':'txt', 'clip-path':'fn', 'translate':'txt', 'scale':'txt', 'rotate':'txt'
  };
  var FNS = /^(translate|translatex|translatey|translatez|translate3d|scale|scalex|scaley|scalez|scale3d|rotate|rotatex|rotatey|rotatez|rotate3d|skew|skewx|skewy|perspective|blur|brightness|contrast|saturate|grayscale|sepia|hue-rotate|drop-shadow|opacity|rgb|rgba|hsl|hsla|calc|var|inset|circle|ellipse|polygon|min|max|clamp)$/;
  var MAX_LEN = 6000, MAX_STOPS = 20, MAX_DECLS = 12;

  function safeValue(v, kind, errs, where){
    v = String(v).trim();
    if(!v || v.length > 300){ errs.push(where + ' : valeur vide ou trop longue.'); return null; }
    if(/[^a-zA-Z0-9\s.,%#()\-+\/*_:]/.test(v)){ errs.push(where + ' : caractère non autorisé dans « ' + v.slice(0, 40) + ' ».'); return null; }
    if(/url\s*\(|expression|javascript|@|\\|;|\{|\}|<|>|!important/i.test(v)){ errs.push(where + ' : valeur non autorisée.'); return null; }
    var depth = 0, m, re = /([a-zA-Z0-9_-]*)\s*\(|\)/g;
    while((m = re.exec(v))){
      if(m[0] === ')'){ depth--; if(depth < 0){ errs.push(where + ' : parenthèses incorrectes.'); return null; } continue; }
      depth++;
      var fn = (m[1] || '').toLowerCase();
      if(fn && !FNS.test(fn)){ errs.push(where + ' : fonction « ' + fn + ' » non autorisée.'); return null; }
      if(fn === 'var'){
        var rest = v.slice(m.index + m[0].length); if(!/^\s*--v6-[a-z0-9-]+\s*(,[^)]*)?\)/.test(rest)){ errs.push(where + ' : seules les variables --v6-* sont permises.'); return null; }
      }
    }
    if(depth !== 0){ errs.push(where + ' : parenthèses non fermées.'); return null; }
    if(kind === 'num' && !/^-?[0-9]*\.?[0-9]+$|^var\(|^calc\(/i.test(v)){ errs.push(where + ' : nombre attendu.'); return null; }
    return v.replace(/\s+/g, ' ');
  }

  /* Retourne { ok, errors, css, names } */
  function validate(input, opts){
    opts = opts || {};
    var errs = [], out = [], names = [];
    var src = String(input == null ? '' : input);
    if(src.length > MAX_LEN) return { ok:false, errors:['Le code dépasse ' + MAX_LEN + ' caractères.'], css:'', names:[] };
    src = src.replace(/\/\*[\s\S]*?\*\//g, ' ').trim();
    if(!src) return { ok:false, errors:['Aucun code à valider.'], css:'', names:[] };
    var pos = 0, blocks = 0;
    while(pos < src.length){
      var rest = src.slice(pos);
      var head = /^\s*@keyframes\s+([a-zA-Z][a-zA-Z0-9_-]{0,50})\s*\{/.exec(rest);
      if(!head){
        errs.push(/^\s*@/.test(rest) ? 'Règle @ non autorisée (seul @keyframes est permis).' : 'Seuls des blocs @keyframes sont acceptés (pas de sélecteur ni de règle libre).');
        break;
      }
      var name = head[1];
      if(opts.prefix && name.indexOf(opts.prefix) !== 0) name = opts.prefix + name;
      if(names.indexOf(name) >= 0){ errs.push('Nom d\'animation en double : ' + name); break; }
      names.push(name);
      var i = pos + head[0].length, depth = 1, start = i;
      while(i < src.length && depth > 0){ var ch = src[i]; if(ch === '{') depth++; else if(ch === '}') depth--; i++; }
      if(depth !== 0){ errs.push('Accolade non fermée dans « ' + name + ' ».'); break; }
      var body = src.slice(start, i - 1);
      pos = i; blocks++;
      if(blocks > 5){ errs.push('5 blocs @keyframes maximum par animation.'); break; }
      var stopRe = /\s*([^{}]+?)\s*\{([^{}]*)\}/g, sm, last = 0, stops = [], used = 0;
      while((sm = stopRe.exec(body))){
        if(body.slice(last, sm.index).trim()){ errs.push('Contenu inattendu dans « ' + name + ' ».'); break; }
        last = stopRe.lastIndex; used++;
        if(used > MAX_STOPS){ errs.push('Trop d\'étapes dans « ' + name + ' » (20 maximum).'); break; }
        var sel = sm[1].split(',').map(function(s){ return s.trim().toLowerCase(); });
        var bad = sel.some(function(s){ return !(s === 'from' || s === 'to' || /^(100|[0-9]{1,2})(\.[0-9]+)?%$/.test(s)); });
        if(bad){ errs.push('Étape invalide « ' + sm[1].trim().slice(0, 30) + ' » (from, to ou un pourcentage).'); break; }
        var decls = sm[2].split(';').map(function(s){ return s.trim(); }).filter(Boolean), clean = [];
        if(decls.length > MAX_DECLS){ errs.push('Trop de propriétés dans une étape (12 maximum).'); break; }
        for(var d = 0; d < decls.length; d++){
          var ci = decls[d].indexOf(':'); if(ci < 1){ errs.push('Déclaration incorrecte : « ' + decls[d].slice(0, 40) + ' ».'); break; }
          var prop = decls[d].slice(0, ci).trim().toLowerCase(), val = decls[d].slice(ci + 1);
          if(!Object.prototype.hasOwnProperty.call(PROPS, prop)){ errs.push('Propriété « ' + prop.slice(0, 30) + ' » non autorisée.'); break; }
          var sv = safeValue(val, PROPS[prop], errs, prop); if(sv === null) break;
          clean.push(prop + ':' + sv);
        }
        if(errs.length) break;
        stops.push(sel.join(',') + '{' + clean.join(';') + '}');
      }
      if(errs.length) break;
      if(body.slice(last).trim()){ errs.push('Contenu inattendu à la fin de « ' + name + ' ».'); break; }
      if(!stops.length){ errs.push('« ' + name + ' » ne contient aucune étape.'); break; }
      out.push('@keyframes ' + name + '{' + stops.join('') + '}');
    }
    if(!errs.length && !out.length) errs.push('Aucune animation reconnue.');
    return { ok: errs.length === 0, errors: errs, css: errs.length ? '' : out.join('\n'), names: names };
  }

  /* ---- Construction du CSS d'application (partagée) ----
   * lib : [{id,name,css}] ; apply : { cible: {anim:id, dur, delay, ease, int} } ; targets : { cible: {sel, on:'load'|'hover'} }
   * Les sélecteurs viennent EXCLUSIVEMENT de `targets` (fixés dans le code), jamais des données. */
  var EASES = ['ease','ease-in','ease-out','ease-in-out','linear','cubic-bezier(.2,.7,.2,1)','cubic-bezier(.34,1.56,.64,1)'];
  function num(v, d, a, b){ v = Number(v); if(!isFinite(v)) v = d; return Math.min(b, Math.max(a, v)); }
  function build(lib, apply, targets){
    var out = [], kf = {}, byId = {};
    (Array.isArray(lib) ? lib : []).slice(0, 80).forEach(function(it){ if(it && typeof it.id === 'string' && /^[a-z0-9-]{1,50}$/.test(it.id)) byId[it.id] = it; });
    apply = apply && typeof apply === 'object' ? apply : {};
    Object.keys(apply).forEach(function(t){
      var a = apply[t], T = targets[t]; if(!T || !a || a.on === false) return;
      var it = byId[a.anim]; if(!it) return;
      var v = validate(it.css, { prefix: 'slx6-' }); if(!v.ok || !v.names.length) return;
      if(!kf[it.id]){ kf[it.id] = 1; out.push(v.css); }
      var ease = EASES.indexOf(a.ease) >= 0 ? a.ease : 'ease';
      var rule = 'animation:' + v.names[0] + ' ' + num(a.dur, 0.6, 0.1, 5) + 's ' + ease + ' ' + num(a.delay, 0, 0, 5) + 's both!important;--v6-i:' + num(a.int, 1, 0.2, 2);
      var sel = T.sel;
      out.push(sel + '{' + rule + '}');
      if(T.off) out.push('@media (prefers-reduced-motion:reduce){' + sel + '{animation:none!important}}');
    });
    out.push('@media (prefers-reduced-motion:reduce){.slx6-nomotion{animation:none!important}}');
    return out.join('\n');
  }
  root.SLX_ANIM_BUILD = build;
  root.SLX_ANIM_EASES = EASES;
  root.SLX_ANIM_VALIDATE = validate;
  if(typeof module !== 'undefined' && module.exports){ module.exports = validate; module.exports.build = build; }
})(typeof window !== 'undefined' ? window : globalThis);
