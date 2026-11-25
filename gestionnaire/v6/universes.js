/* SEN LUXE v6.2 — Univers complets, ensembles et animations individuelles (DONNÉES uniquement : specs « Motion Script »).
 * Un univers anime tout le site de façon coordonnée ; il se combine avec les réglages personnels (motion / motionScripts)
 * et avec un interrupteur général (motionMaster.on). Partagé gestionnaire / site public. */
(function(root){
  'use strict';
  const S = (target, trigger, from, to, x) => Object.assign({ name: '', target, trigger, from: from || {}, to: to || {} }, x || {});
  const CLIPV = 'inset(100% 0% 0% 0%)', CLIP0 = 'inset(0% 0% 0% 0%)';
  /* génère un univers cohérent à partir de paramètres (rythme, courbe, amplitude, signature) */
  function universe(id, name, desc, P){
    const d = P.dur, e = P.ease, y = P.y, st = P.stagger, ix = P.intensity || 1, sc = [];
    const add = (nm, s) => { s.name = nm; s.ease = s.ease || e; s.intensity = s.intensity || ix; sc.push(s); };
    add('En-tête', S('header', 'load', { y: -y, opacity: 0 }, {}, { duration: d * .9 }));
    add('Navigation', S('nav', 'load', { y: -y * .5, opacity: 0 }, {}, { duration: d * .8, delay: .15, stagger: st }));
    add('Menus et sous-menus', S('menus', 'enter', { opacity: 0, y: y * .4 }, {}, { duration: d * .7, stagger: st * .6 }));
    add('Textes de la bannière', S('hero', 'load', P.heroFrom || { y: y * 1.4, opacity: 0, blur: P.blur || 0 }, {}, { duration: d * 1.2, delay: .25, stagger: st * 2 }));
    if(P.banner) add('Fond de bannière', S('banners', 'load', { scale: P.banner, opacity: .6 }, { scale: 1, opacity: 1 }, { duration: d * 2, ease: 'smooth' }));
    add('Sections', S('sections', 'enter', P.sectionFrom || { y: y * 1.2, opacity: 0, blur: P.blur || 0 }, {}, { duration: d * 1.1 }));
    if(P.images) add('Révélation des images', S('images', 'enter', { clip: CLIPV, scale: 1.12 }, { clip: CLIP0, scale: 1 }, { duration: d * 1.3, stagger: st }));
    add('Cartes', S('cards', 'enter', P.cardFrom || { y: y * 1.3, opacity: 0, scale: .96 }, {}, { duration: d, stagger: st }));
    add('Badges', S('badges', 'enter', { scale: 0, rotate: P.badgeRot || 0, opacity: 0 }, {}, { duration: d * .7, delay: .2, ease: 'spring' }));
    add('Boutons au survol', S('buttons', 'hover', {}, P.hover || { y: -3 }, { duration: d * .4, ease: 'smooth' }));
    add('Panier', S('cart', 'enter', { x: y * 1.6, opacity: 0 }, {}, { duration: d * .9, stagger: st }));
    add('Pied de page', S('footer', 'enter', { y: y, opacity: 0 }, {}, { duration: d, stagger: st * 1.5 }));
    if(P.page) add('Transition de page', S('page', 'load', {}, {}, { duration: P.page[2] || d * 1.2, variant: P.page[0], color: P.page[1], ease: 'snap' }));
    if(P.page) add('Transition entre rubriques', S('page', 'click', {}, {}, { duration: (P.page[2] || d * 1.2) * .9, variant: P.page[0], color: P.page[1], ease: 'snap' }));
    if(P.parallax) add('Parallaxe douce', S('images', 'scroll', { y: -P.parallax }, { y: P.parallax }, { ease: 'linear' }));
    const motion = Object.assign({ logo: { b: 'logo-build', dur: d, trig: 'load' }, prices: { b: 'count-up', dur: d * 1.3 }, cart: { b: 'cart-bump', dur: d * .7 }, buttons: { b: 'btn-press', dur: d * .5 } }, P.motion || {});
    Object.keys(motion).forEach(k => { motion[k].on = true; });
    return { id, name, desc, scope: 'univers', scripts: sc, motion, tags: P.tags || [] };
  }
  const UNIVERSES = [
    universe('ecrin', 'Écrin', 'Élégance joaillière : mouvements lents et feutrés, tout semble se poser délicatement.', { dur: .9, ease: 'soft', y: 18, stagger: .08, blur: 6, intensity: .9, images: true, page: ['fade', '#0a0a0a', .9], tags: ['lent', 'luxe'] }),
    universe('eclat', 'Éclat', 'Dynamique et brillant : ressorts, rebonds et balayage doré à chaque changement de page.', { dur: .6, ease: 'spring', y: 26, stagger: .05, badgeRot: -25, hover: { y: -5, scale: 1.04 }, page: ['wipe', '#d4af37', .8], tags: ['vif', 'ressort'] }),
    universe('soie', 'Soie', 'Fluide et minimal : fondus doux et flou léger, aucun effet voyant.', { dur: .8, ease: 'smooth', y: 10, stagger: .06, blur: 10, intensity: .8, heroFrom: { opacity: 0, blur: 12 }, sectionFrom: { opacity: 0, blur: 8 }, cardFrom: { opacity: 0, blur: 6 }, motion: { logo: { b: 'logo-build', dur: .8, trig: 'load' } }, tags: ['minimal', 'doux'] }),
    universe('noir-or', 'Noir & Or', 'Cinématique : rideau noir d\'entrée, bannière qui se pose, images dévoilées en masque, parallaxe.', { dur: 1, ease: 'smooth', y: 30, stagger: .09, banner: 1.12, images: true, parallax: 18, page: ['curtain', '#0a0a0a', 1.1], tags: ['cinéma', 'fort'] }),
    universe('precision', 'Précision', 'Net et rapide : glissements latéraux courts, courbes sèches, rythme régulier.', { dur: .45, ease: 'snap', y: 14, stagger: .035, heroFrom: { x: -40, opacity: 0 }, sectionFrom: { x: 36, opacity: 0 }, cardFrom: { x: 28, opacity: 0 }, hover: { y: -2 }, page: ['wipe', '#0a0a0a', .6], tags: ['rapide', 'net'] }),
    universe('signature', 'Signature SEN LUXE', 'L\'univers maison : logo qui se construit, prix qui comptent, cascade de cartes, iris doré, parallaxe discrète.', { dur: .8, ease: 'smooth', y: 22, stagger: .07, blur: 4, banner: 1.06, images: true, parallax: 12, badgeRot: -15, page: ['iris', '#d4af37', 1], motion: { cards: { b: 'cards-cascade', dur: .8, dir: 'diagonal', stagger: .08 } }, tags: ['complet', 'signature'] })
  ];
  /* ensembles : composants, sections, transitions, globales */
  const sp = (name, s) => Object.assign({ name }, s);
  const PACKS = [
    { id: 'p-cartes', scope: 'component', name: 'Cartes en vague', desc: 'Les cartes produits montent par vagues, avec badges à ressort.', scripts: [sp('Cartes', S('cards', 'enter', { y: 34, opacity: 0, scale: .96 }, {}, { duration: .75, stagger: .07 })), sp('Badges', S('badges', 'enter', { scale: 0, opacity: 0 }, {}, { duration: .5, delay: .2, ease: 'spring' }))] },
    { id: 'p-entete', scope: 'component', name: 'En-tête et navigation', desc: 'L\'en-tête descend, les liens suivent un à un, les sous-menus se déploient.', scripts: [sp('En-tête', S('header', 'load', { y: -24, opacity: 0 }, {}, { duration: .7 })), sp('Liens', S('nav', 'load', { y: -10, opacity: 0 }, {}, { duration: .5, delay: .15, stagger: .06 })), sp('Sous-menus', S('menus', 'enter', { y: 8, opacity: 0 }, {}, { duration: .4, stagger: .04 }))] },
    { id: 'p-boutons', scope: 'component', name: 'Boutons réactifs', desc: 'Léger soulèvement au survol, compression au clic.', scripts: [sp('Survol', S('buttons', 'hover', {}, { y: -3, scale: 1.03 }, { duration: .25 })), sp('Clic', S('buttons', 'click', { scale: .94 }, {}, { duration: .35, ease: 'spring' }))] },
    { id: 'p-panier', scope: 'component', name: 'Panier fluide', desc: 'Le panier et ses articles glissent à l\'entrée.', scripts: [sp('Panier', S('cart', 'enter', { x: 30, opacity: 0 }, {}, { duration: .6, stagger: .06 })), sp('Fiche rapide', S('modal', 'enter', { y: 20, opacity: 0, scale: .97 }, {}, { duration: .5 }))] },
    { id: 'p-pied', scope: 'component', name: 'Pied de page en cascade', desc: 'Les colonnes du pied de page apparaissent l\'une après l\'autre.', scripts: [sp('Pied de page', S('footer', 'enter', { y: 24, opacity: 0 }, {}, { duration: .7, stagger: .1 }))] },
    { id: 's-rideau', scope: 'section', name: 'Sections : rideau', desc: 'Chaque section se dévoile comme un rideau.', scripts: [sp('Sections', S('sections', 'enter', { clip: CLIPV }, { clip: CLIP0 }, { duration: .9, ease: 'smooth' }))] },
    { id: 's-montee', scope: 'section', name: 'Sections : montée douce', desc: 'Les sections montent en fondu.', scripts: [sp('Sections', S('sections', 'enter', { y: 36, opacity: 0 }, {}, { duration: .9 }))] },
    { id: 's-flou', scope: 'section', name: 'Sections : fondu net', desc: 'Les sections passent du flou à la netteté.', scripts: [sp('Sections', S('sections', 'enter', { blur: 10, opacity: 0 }, {}, { duration: .9 }))] },
    { id: 's-images', scope: 'section', name: 'Images : révélation en masque', desc: 'Visuels dévoilés de bas en haut avec léger zoom arrière.', scripts: [sp('Images', S('images', 'enter', { clip: CLIPV, scale: 1.12 }, { clip: CLIP0, scale: 1 }, { duration: 1.1, stagger: .08 }))] },
    { id: 't-rideau', scope: 'transition', name: 'Page : rideau noir', desc: 'Un rideau noir se lève à l\'ouverture et se referme entre les rubriques.', scripts: [sp('Rideau', S('page', 'load', {}, {}, { variant: 'curtain', color: '#0a0a0a', duration: 1, ease: 'snap' })), sp('Navigation', S('page', 'click', {}, {}, { variant: 'curtain', color: '#0a0a0a', duration: .9, ease: 'snap' }))] },
    { id: 't-balayage', scope: 'transition', name: 'Page : balayage doré', desc: 'Un balayage doré traverse l\'écran.', scripts: [sp('Balayage', S('page', 'load', {}, {}, { variant: 'wipe', color: '#d4af37', duration: .8, ease: 'snap' })), sp('Navigation', S('page', 'click', {}, {}, { variant: 'wipe', color: '#d4af37', duration: .7, ease: 'snap' }))] },
    { id: 't-iris', scope: 'transition', name: 'Page : iris', desc: 'Le nouvel écran s\'ouvre en cercle depuis le centre.', scripts: [sp('Iris', S('page', 'load', {}, {}, { variant: 'iris', color: '#0a0a0a', duration: 1, ease: 'smooth' })), sp('Navigation', S('page', 'click', {}, {}, { variant: 'iris', color: '#0a0a0a', duration: .9, ease: 'smooth' }))] },
    { id: 't-fondu', scope: 'transition', name: 'Page : fondu', desc: 'Fondu doux depuis le noir.', scripts: [sp('Fondu', S('page', 'load', {}, {}, { variant: 'fade', color: '#0a0a0a', duration: .8, ease: 'soft' }))] },
    { id: 'g-parallaxe', scope: 'global', name: 'Parallaxe douce', desc: 'Les images bougent légèrement pendant le défilement.', scripts: [sp('Parallaxe', S('images', 'scroll', { y: -16 }, { y: 16 }, { ease: 'linear' }))] },
    { id: 'g-survol', scope: 'global', name: 'Survol universel', desc: 'Cartes, boutons et liens réagissent au survol.', scripts: [sp('Cartes', S('cards', 'hover', {}, { y: -6 }, { duration: .35 })), sp('Boutons', S('buttons', 'hover', {}, { scale: 1.03 }, { duration: .25 })), sp('Liens', S('nav', 'hover', {}, { y: -2 }, { duration: .25 }))] },
    { id: 'g-respiration', scope: 'global', name: 'Respiration de la bannière', desc: 'La bannière d\'accueil se pose en zoom arrière lent.', scripts: [sp('Bannière', S('banners', 'load', { scale: 1.1 }, { scale: 1 }, { duration: 2.2, ease: 'smooth' }))] }
  ];
  const SINGLES = [
    { id: 'i-montee', name: 'Montée en fondu', desc: 'Apparition avec glissement vers le haut.', spec: S('cards', 'enter', { y: 30, opacity: 0 }, {}, { duration: .7, stagger: .06 }) },
    { id: 'i-masque', name: 'Révélation en masque', desc: 'L\'élément se dévoile de bas en haut.', spec: S('images', 'enter', { clip: CLIPV }, { clip: CLIP0 }, { duration: .9 }) },
    { id: 'i-pop', name: 'Apparition à ressort', desc: 'L\'élément grossit avec un rebond.', spec: S('badges', 'enter', { scale: 0, opacity: 0 }, {}, { duration: .6, ease: 'spring' }) },
    { id: 'i-bascule', name: 'Bascule en entrée', desc: 'Léger pivot en arrivant.', spec: S('cards', 'enter', { rotate: -4, y: 24, opacity: 0 }, {}, { duration: .8, origin: 'bottom left', stagger: .06 }) },
    { id: 'i-flou', name: 'Mise au point', desc: 'Passe du flou à la netteté.', spec: S('hero', 'load', { blur: 14, opacity: 0 }, {}, { duration: 1, stagger: .12 }) },
    { id: 'i-survol', name: 'Soulèvement au survol', desc: 'Remonte légèrement au survol.', spec: S('cards', 'hover', {}, { y: -6, scale: 1.015 }, { duration: .3 }) },
    { id: 'i-eclat', name: 'Éclat au clic', desc: 'Petite compression au clic.', spec: S('buttons', 'click', { scale: .92 }, {}, { duration: .4, ease: 'spring' }) },
    { id: 'i-defile', name: 'Défilement parallaxe', desc: 'Suit le défilement de la page.', spec: S('images', 'scroll', { y: -20 }, { y: 20 }, { ease: 'linear' }) }
  ].map(x => { x.spec.name = x.name; return x; });

  /* résolution : charge utile publiée → configuration effective (interrupteur, univers, réglages personnels) */
  function resolve(p){
    p = p || {}; const mm = p.motionMaster, hasAny = p.motion || p.motionScripts || mm;
    if(mm && mm.on === false) return { on: false, motion: {}, scripts: [] };
    const u = mm && mm.universe ? UNIVERSES.find(x => x.id === mm.universe) : null, mute = mm && Array.isArray(mm.mute) ? mm.mute : [];
    const motion = Object.assign({}, u ? u.motion : {}, p.motion && typeof p.motion === 'object' ? p.motion : {});
    const scripts = (u ? u.scripts.filter(s => mute.indexOf(s.name) < 0) : []).concat((Array.isArray(p.motionScripts) ? p.motionScripts : []).filter(w => w && w.on !== false && w.spec).map(w => w.spec)).slice(0, 40);
    return { on: !!hasAny, motion, scripts, universe: u ? u.id : '' };
  }
  root.SLX_UNIVERSES = { UNIVERSES, PACKS, SINGLES, resolve, S };
})(typeof window !== 'undefined' ? window : globalThis);
