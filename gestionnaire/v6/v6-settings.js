/* SEN LUXE v6 — PARAMÈTRES : Sécurité, Autres paramètres (index A–Z), Pixels et intégrations, Préférences générales. */
(function(){
  'use strict';
  var V6 = window.V6; if(!V6) return;
  var h = V6.h, $q = function(s, r){ return (r || document).querySelector(s); };
  var miss = function(e){ return /introuvable|not find|PGRST202|404/i.test(String(e && e.message || e)); };
  var connected = function(){ return typeof AN !== 'undefined' && AN.session && ADM.pass; };
  var needLogin = '<div class="banner">Connectez-vous (écran d\'accès administrateur) pour utiliser cette section : elle lit et écrit sur le serveur.</div>';

  /* ======================= SÉCURITÉ ======================= */
  V6.sec = { status: null, err: '', hist: null, busy: false, tried: 0 };
  function badge(t, cls){ return '<span class="v6-badge ' + (cls || '') + '">' + h(t) + '</span>'; }
  /* Partie dynamique (état serveur) : mise à jour SUR PLACE, sans refaire toute la page. */
  function secDyn(){
    var st = V6.sec.status, e = V6.sec.err, r = st && st.recovery, k = '';
    if(e === 'migration') k = '<div class="banner">Le module « code de secours » n\'est pas encore installé sur le serveur (migration v6 non appliquée). Les fonctions de sécurité existantes (changement de code, sessions, journal) restent disponibles ci-dessous.</div>';
    else if(e) k = '<div class="banner">' + h(e) + '</div>';
    var card = st ? '<div class="v6-kpis"><div class="v6-kpi"><span>Dernier changement du code</span><b>' + h(st.password_changed_at ? dateFr(st.password_changed_at) : '—') + '</b></div><div class="v6-kpi"><span>Sessions ouvertes</span><b>' + h(st.sessions_active) + '</b></div><div class="v6-kpi"><span>Échecs (24 h)</span><b>' + h(st.failures_24h) + '</b></div><div class="v6-kpi"><span>Code de secours</span><b>' + (r && r.active ? badge('actif', 'ok') : r && r.used_at ? badge('utilisé', 'warn') : r && r.revoked_at ? badge('révoqué', 'warn') : badge('non créé')) + '</b></div></div>' : (e ? '' : '<p class="muted">Chargement de l\'état de sécurité…</p>');
    var hist = Array.isArray(V6.sec.hist) && V6.sec.hist.length ? '<div class="an-table-wrap"><table class="an-table"><thead><tr><th>Date</th><th>Événement</th></tr></thead><tbody>' + V6.sec.hist.map(function(x){ var L = { recuperation_code_genere: 'Code de secours généré', recuperation_code_revoque: 'Code de secours révoqué', recuperation_reussie: 'Récupération réussie', recuperation_echec: 'Tentative de récupération échouée' }; return '<tr><td>' + h(dateFr(x.at)) + '</td><td>' + h(L[x.action] || x.action) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<p class="muted">Aucun événement de récupération.</p>';
    var rec = e === 'migration' ? '' : '<h3 class="se-h">Code de secours</h3><p class="hint" style="margin-top:0">Un code à usage unique, conservé <b>haché</b> sur le serveur, qui permet de choisir un nouveau code si vous oubliez l\'actuel (« Code oublié ? » sur l\'écran de connexion). Il n\'est affiché qu\'<b>une seule fois</b> : notez-le hors ligne. Générer un nouveau code révoque l\'ancien.</p><div class="v6-row"><button type="button" class="btn dark" data-act="v6RecGen">' + (r && r.active ? 'Renouveler le code de secours' : 'Générer un code de secours') + '</button>' + (r && r.active ? '<button type="button" class="btn ghost" data-act="v6RecRevoke">Révoquer</button>' : '') + '</div><h4 class="v6-h4">Historique</h4>' + hist;
    return k + card + rec;
  }
  /* Une seule tentative par minute (et jamais en boucle) ; le résultat met à jour uniquement le bloc dynamique. */
  async function secLoad(force){
    if(!connected() || V6.sec.busy) return;
    if(!force && V6.sec.tried && Date.now() - V6.sec.tried < 60000) return;
    V6.sec.busy = true; V6.sec.tried = Date.now();
    var before = JSON.stringify([V6.sec.status, V6.sec.err, V6.sec.hist]);
    try{ V6.sec.status = await rpc('senluxe_admin_security_status', { p_token: ADM.pass }); V6.sec.err = ''; }
    catch(e){ V6.sec.err = miss(e) ? 'migration' : e.message; V6.sec.status = null; }
    try{ if(!V6.sec.err) V6.sec.hist = await rpc('senluxe_admin_recovery_history', { p_token: ADM.pass }); }catch(e){}
    V6.sec.busy = false;
    if(JSON.stringify([V6.sec.status, V6.sec.err, V6.sec.hist]) === before) return;
    var el = document.getElementById('v6-sec-dyn'); if(el && UI.view === 'settings' && V6.tab.settings === 'security'){ el.innerHTML = secDyn(); var v = document.getElementById('view'); if(v) V6.render(v, true, true); }
  }
  function secTab(){
    if(!connected()) return needLogin;
    if(!V6.sec.tried) setTimeout(function(){ secLoad(false); }, 0);
    var tf = '<h3 class="se-h">Double authentification (2FA)</h3><div class="v6-note"><b>Architecture prévue, non activée.</b> L\'emplacement serveur et l\'interface sont réservés ; aucune fausse protection n\'est affichée. Elle sera proposée lorsqu\'elle sera réellement vérifiable.</div>';
    var prot = '<h3 class="se-h">Protections actives</h3><ul class="v4-checks"><li class="ok">Code haché en bcrypt côté serveur ; jamais présent dans le HTML ni dans le navigateur.</li><li class="ok">Verrouillage après 10 échecs en 15 minutes, avec temporisation progressive et alerte d\'activité suspecte.</li><li class="ok">Sessions : jeton aléatoire révocable, 12 h d\'inactivité maximum, 7 jours au total ; restaurées après un rechargement uniquement après vérification serveur.</li><li class="ok">Code temporaire : changement obligatoire à la première connexion.</li></ul>';
    return '<div id="v6-sec-dyn">' + secDyn() + '</div>' + tf + prot + '<h3 class="se-h">Sessions, changement de code et journal</h3>' + (typeof dtSecurity === 'function' ? dtSecurity() : '');
  }
  function askCurrent(title, intro, cb){
    var m = openModal({ title: title, body: '<p class="hint" style="margin-top:0">' + intro + '</p><div class="field"><label for="v6cur">Code administrateur actuel</label><input type="password" id="v6cur" autocomplete="current-password"></div><p id="v6cs" class="hint" aria-live="polite"></p>', foot: '<button type="button" class="btn ghost" data-close>Annuler</button><button type="button" class="btn dark" id="v6ok">Continuer</button>' });
    $q('#v6cur', m.wrap).focus();
    $q('#v6ok', m.wrap).onclick = async function(){ var v = $q('#v6cur', m.wrap).value; if(!v) return $q('#v6cs', m.wrap).textContent = 'Saisissez votre code.'; this.disabled = true; var r = await cb(v, m); this.disabled = false; if(r !== true) $q('#v6cs', m.wrap).textContent = r || 'Opération refusée.'; };
  }
  Object.assign(ACT_EXTRA, {
    v6RecGen: function(){ askCurrent('Code de secours', 'Pour des raisons de sécurité, confirmez votre code actuel.', async function(cur, m){
      try{ var r = await rpc('senluxe_admin_recovery_generate', { p_token: ADM.pass, p_current: cur }); if(!r || !r.ok) return (r && r.error) || 'Refusé.';
        requestClose(m); var code = r.code;
        var m2 = openModal({ title: 'Votre code de secours', body: '<p class="hint" style="margin-top:0"><b>Notez-le maintenant.</b> Il ne sera plus jamais affiché. Rangez-le hors ligne, séparément de votre code habituel.</p><div class="v6-code" id="v6code">' + h(code) + '</div><div class="v6-row"><button type="button" class="btn" id="v6cp">Copier</button></div>', foot: '<button type="button" class="btn dark" data-close>J\'ai noté mon code</button>', onClose: function(){ var el = $q('#v6code'); if(el) el.textContent = ''; code = null; } });
        $q('#v6cp', m2.wrap).onclick = function(){ try{ navigator.clipboard.writeText(code); toast('Code copié.'); }catch(e){ toast('Copie impossible : recopiez-le à la main.', 'err'); } };
        secLoad(true); return true; }catch(e){ return e.message; } }); },
    v6RecRevoke: function(){ askCurrent('Révoquer le code de secours', 'Le code de secours actuel cessera de fonctionner.', async function(cur, m){
      try{ var r = await rpc('senluxe_admin_recovery_revoke', { p_token: ADM.pass, p_current: cur }); if(!r || !r.ok) return (r && r.error) || 'Refusé.'; requestClose(m); toast('Code de secours révoqué.'); secLoad(true); return true; }catch(e){ return e.message; } }); }
  });

  /* ======================= AUTRES PARAMÈTRES (A–Z) ======================= */
  var SET = function(){ return (typeof SALES !== 'undefined' && SALES.settings) || {}; };
  V6.F = { q: '', letter: '', state: '', sub: '', open: '' };
  function numCfg(key, label, min, max, def, unit){ return { key: key, kind: 'num', label: label, min: min, max: max, def: def, unit: unit }; }
  function registry(){
    var s = SET(), pr = V6.cfg.mgr_prefs, ig = D().integrations || {};
    return [
      { id: 'abandon', title: 'Délai d\'abandon de panier', sub: 'Commandes', desc: 'Durée sans activité après laquelle un panier est considéré comme abandonné.', state: 'actif', cfg: numCfg('abandon_minutes', 'Minutes', 5, 10080, 60, 'min') },
      { id: 'alertes', title: 'Alertes de nouvelles commandes', sub: 'Commandes', desc: 'Notification dans le gestionnaire lorsqu\'une commande arrive.', state: s.notify_orders === false ? 'inactif' : 'actif', cfg: { key: 'notify_orders', kind: 'bool', label: 'Activer les alertes' } },
      { id: 'anim', title: 'Animations du site web', sub: 'Apparence', desc: 'Bibliothèque d\'animations appliquées au site public (publication explicite).', state: Object.keys(D().animApply || {}).length ? 'actif' : 'inactif', link: ['studio', 'site'] },
      { id: 'sauv', title: 'Sauvegardes et historique', sub: 'Données', desc: 'Sauvegardes, versions publiées et restauration.', state: 'actif', link: ['details'] },
      { id: 'consent', title: 'Bandeau de consentement', sub: 'Intégrations', desc: 'Demande l\'accord des visiteurs avant de charger pixels et mesures.', state: ig.requireConsent === false ? 'inactif' : 'actif', link: ['settings', 'pixels'] },
      { id: 'cadence', title: 'Fréquence d\'actualisation des commandes', sub: 'Commandes', desc: 'Intervalle de rafraîchissement lorsque le temps réel est indisponible.', state: 'actif', cfg: numCfg('poll_seconds', 'Secondes', 5, 300, 10, 's') },
      { id: 'densite', title: 'Densité d\'affichage', sub: 'Interface', desc: 'Compact, normale ou large.', state: pr.density === 'normal' ? 'inactif' : 'actif', link: ['settings', 'prefs'] },
      { id: 'limite', title: 'Limite de commandes par appareil', sub: 'Sécurité', desc: 'Nombre maximal de commandes par 10 minutes (anti-abus).', state: 'actif', cfg: numCfg('rate_orders_per_10min', 'Commandes / 10 min', 1, 100, 5, '') },
      { id: 'mouv', title: 'Réduire les animations du gestionnaire', sub: 'Interface', desc: 'Supprime les animations de l\'interface d\'administration.', state: pr.reduceMotion ? 'actif' : 'inactif', cfg: { key: '@reduceMotion', kind: 'bool', label: 'Réduire les animations' } },
      { id: 'apparence', title: 'Apparence du gestionnaire', sub: 'Interface', desc: 'Couleurs, formats et animations de l\'interface.', state: V6.cfg.mgr_theme.preset !== 'classic' || V6.cfg.mgr_theme.dark ? 'actif' : 'inactif', link: ['studio', 'manager'] },
      { id: '2fa', title: 'Double authentification (2FA)', sub: 'Sécurité', desc: 'Second facteur à la connexion. Architecture réservée.', state: 'preparation' },
      { id: 'compta', title: 'Export comptable', sub: 'Données', desc: 'Export des ventes pour la comptabilité.', state: 'preparation' },
      { id: 'multi', title: 'Plusieurs administrateurs et rôles', sub: 'Sécurité', desc: 'Comptes distincts avec droits limités.', state: 'preparation' },
      { id: 'mail', title: 'Notifications par e-mail', sub: 'Commandes', desc: 'Alertes de commande envoyées à votre équipe par e-mail.', state: V6.cfg.v6_notify.emails.length ? 'actif' : 'inactif', link: ['settings', 'notify'] },
      { id: 'promo', title: 'Codes promotionnels', sub: 'Ventes', desc: 'Réductions par code, avec règles et dates.', state: 'preparation' },
      { id: 'avis', title: 'Avis clients', sub: 'Ventes', desc: 'Collecte et modération des avis.', state: 'preparation' },
      { id: 'wa', title: 'Notifications WhatsApp', sub: 'Commandes', desc: 'Alertes de commande sur WhatsApp (API officielle).', state: V6.cfg.v6_notify.whatsapp.length ? 'actif' : 'inactif', link: ['settings', 'notify'] },
      { id: 'centre', title: 'Centre de notifications', sub: 'Interface', desc: 'Messages techniques classés par priorité.', state: 'actif', link: ['notifs'] }
    ].sort(function(a, b){ return a.title.localeCompare(b.title, 'fr'); });
  }
  var EXPL = {
    abandon: ['Savoir quels paniers sont réellement abandonnés.', 'Le statut « abandonné » et les statistiques de paniers.', 'Saisissez un nombre de minutes puis Enregistrer.', 'Appliqué immédiatement aux listes ; aucun panier n\'est modifié.'],
    alertes: ['Être prévenu dès qu\'une commande arrive.', 'Affichage d\'une alerte dans ce gestionnaire.', 'Case à cocher.', 'Enregistré sur le serveur, effectif tout de suite.'],
    anim: ['Donner du mouvement au site public.', 'Seulement l\'apparence du site, après publication explicite.', 'Ouvrez COULEURS ET ANIMATIONS › SITE WEB.', 'Rien n\'est publié tant que vous ne confirmez pas.'],
    sauv: ['Revenir à une version précédente en cas d\'erreur.', 'Aucun changement : consultation et restauration.', 'Ouvrez DÉTAILS.', 'Une restauration demande confirmation.'],
    consent: ['Respecter le choix des visiteurs (RGPD).', 'Un bandeau s\'affiche ; aucun pixel ne se charge avant accord.', 'Case dans Pixels et intégrations.', 'Effectif après publication des intégrations.'],
    cadence: ['Garder les commandes à jour sans temps réel.', 'Fréquence des requêtes de rafraîchissement.', 'Nombre de secondes (5 à 300) puis Enregistrer.', 'Appliqué immédiatement.'],
    densite: ['Afficher plus d\'informations ou des zones plus grandes.', 'Espacements de ce gestionnaire uniquement.', 'Menu dans Préférences générales.', 'Mémorisé sur cet appareil et le serveur.'],
    limite: ['Empêcher les commandes en rafale abusives.', 'Nombre maximal de commandes par appareil toutes les 10 minutes.', 'Saisissez la valeur (1 à 100) puis Enregistrer.', 'Appliqué aux prochaines commandes ; les clients au-delà voient un message d\'attente.'],
    mouv: ['Confort pour les personnes sensibles au mouvement.', 'Supprime les animations de ce gestionnaire.', 'Case à cocher.', 'Immédiat, mémorisé.'],
    apparence: ['Personnaliser les couleurs du gestionnaire.', 'Uniquement ce gestionnaire, jamais le site public.', 'Ouvrez COULEURS ET ANIMATIONS › Gestionnaire.', 'Aperçu direct puis Enregistrer.'],
    mail: ['Être prévenu par e-mail d\'une commande.', 'Destinataires internes ; jamais visibles des clients.', 'Ajoutez des adresses dans Notifications de commande.', 'L\'envoi réel exige la fonction serveur et ses clés (voir la page).'],
    wa: ['Être prévenu sur WhatsApp.', 'Numéros internes au format international.', 'Ajoutez des numéros dans Notifications de commande.', 'L\'envoi réel exige l\'API WhatsApp Business et ses identifiants.'],
    centre: ['Voir les alertes techniques sans encombrer l\'accueil.', 'Aucune donnée modifiée : lecture, archivage, liens.', 'Ouvrez NOTIFICATIONS.', 'Lu / archivé mémorisé.'],
    '2fa': ['Protéger l\'accès même si le code est découvert : après le code, un second contrôle (application d\'authentification) est demandé.', 'Ajouterait une étape à la connexion.', 'Pas encore activable.', 'En attendant : code robuste (10 caractères, lettre + chiffre) et code de récupération.']
  };
  function explHtml(id){ var e = EXPL[id]; return e ? '<dl class="v6-expl"><dt>À quoi ça sert</dt><dd>' + h(e[0]) + '</dd><dt>Ce que cela change</dt><dd>' + h(e[1]) + '</dd><dt>Comment l\'activer / modifier</dt><dd>' + h(e[2]) + '</dd><dt>Après l\'enregistrement</dt><dd>' + h(e[3]) + '</dd></dl>' : ''; }
  var STATE = { actif: ['Actif', 'ok'], inactif: ['Inactif', ''], preparation: ['En préparation', 'warn'] };
  function featTab(){
    var all = registry(), F = V6.F, q = F.q.trim().toLowerCase();
    var letters = {}; all.forEach(function(x){ letters[x.title[0].toUpperCase()] = 1; });
    var list = all.filter(function(x){ return (!F.letter || x.title[0].toUpperCase() === F.letter) && (!F.state || x.state === F.state) && (!F.sub || x.sub === F.sub) && (!q || (x.title + ' ' + x.desc + ' ' + x.sub).toLowerCase().indexOf(q) >= 0); });
    var subs = Array.from(new Set(all.map(function(x){ return x.sub; }))).sort();
    var az = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(function(l){ return '<button type="button" class="' + (F.letter === l ? 'on' : '') + '" ' + (letters[l] ? '' : 'disabled') + ' data-act="v6Letter" data-arg="' + l + '">' + l + '</button>'; }).join('');
    var rows = list.map(function(x){
      var st = STATE[x.state], open = F.open === x.id, body = '';
      if(open){ body = explHtml(x.id);
        if(x.state === 'preparation') body += '<div class="v6-note">Fonctionnalité <b>en préparation</b> : elle n\'est pas disponible et rien n\'est simulé. Elle apparaîtra ici avec ses réglages dès qu\'elle sera réellement opérationnelle.</div>';
        else if(x.link) body += '<button type="button" class="btn dark" data-act="v6Go" data-arg="' + x.link.join(':') + '">Ouvrir le réglage</button>';
        else if(x.cfg) body += cfgHtml(x);
      }
      return '<div class="v6-feat ' + (open ? 'open' : '') + '"><button type="button" class="v6-feat-h" data-act="v6Feat" data-arg="' + x.id + '" aria-expanded="' + open + '"><span class="v6-az">' + h(x.title[0].toUpperCase()) + '</span><span class="v6-ft"><b>' + h(x.title) + '</b><small>' + h(x.sub) + ' — ' + h(x.desc) + '</small></span>' + badge(st[0], st[1]) + '</button>' + (open ? '<div class="v6-feat-b">' + body + '</div>' : '') + '</div>';
    }).join('') || '<p class="muted">Aucune fonctionnalité ne correspond.</p>';
    return '<div class="v6-filters"><input type="search" id="v6q" class="v6-q" placeholder="Rechercher une fonctionnalité…" value="' + h(F.q) + '" data-v6c="q"><select data-v6c="state" aria-label="État"><option value="">Tous les états</option><option value="actif"' + (F.state === 'actif' ? ' selected' : '') + '>Actif</option><option value="inactif"' + (F.state === 'inactif' ? ' selected' : '') + '>Inactif</option><option value="preparation"' + (F.state === 'preparation' ? ' selected' : '') + '>En préparation</option></select><select data-v6c="sub" aria-label="Sous-catégorie"><option value="">Toutes les catégories</option>' + subs.map(function(s){ return '<option' + (F.sub === s ? ' selected' : '') + '>' + h(s) + '</option>'; }).join('') + '</select></div><div class="v6-az-bar" aria-label="Index alphabétique"><button type="button" class="' + (F.letter ? '' : 'on') + '" data-act="v6Letter" data-arg="">Tous</button>' + az + '</div><div class="v6-feats">' + rows + '</div>';
  }
  function cfgHtml(x){
    var c = x.cfg, s = SET();
    if(c.kind === 'bool'){
      var on = c.key === '@reduceMotion' ? !!V6.cfg.mgr_prefs.reduceMotion : s[c.key] !== false;
      return '<label class="v6-switch"><input type="checkbox" data-v6c="bool" data-key="' + c.key + '"' + (on ? ' checked' : '') + '> ' + h(c.label) + '</label>' + (c.key[0] !== '@' && !connected() ? '<p class="hint">Connectez-vous pour enregistrer ce réglage sur le serveur.</p>' : '');
    }
    var v = s[c.key] !== undefined ? s[c.key] : c.def;
    return '<div class="v6-row"><div class="field"><label for="v6n-' + c.key + '">' + h(c.label) + ' (' + c.min + '–' + c.max + ')</label><input type="number" id="v6n-' + c.key + '" min="' + c.min + '" max="' + c.max + '" value="' + h(v) + '"></div><button type="button" class="btn dark" data-act="v6SetNum" data-arg="' + c.key + ':' + c.min + ':' + c.max + '">Enregistrer</button></div>' + (connected() ? '' : '<p class="hint">Connectez-vous pour enregistrer ce réglage sur le serveur.</p>');
  }
  V6.setSetting = async function(key, val){
    if(!connected()){ toast('Connectez-vous pour enregistrer ce réglage.', 'err'); return false; }
    try{ await rpc('senluxe_admin_setting_set', { p_token: ADM.pass, p_key: key, p_value: val }); SALES.settings = SALES.settings || {}; SALES.settings[key] = val;
      if(key === 'abandon_minutes' && typeof ABANDON_MINUTES !== 'undefined') ABANDON_MINUTES = val; if(key === 'poll_seconds' && typeof salesStartPolling === 'function') salesStartPolling();
      toast('Réglage enregistré sur le serveur.'); return true; }catch(e){ toast('Erreur : ' + h(e.message), 'err'); return false; }
  };
  Object.assign(ACT_EXTRA, {
    v6Letter: function(a){ V6.F.letter = a || ''; V6.rerender(); },
    v6Feat: function(a){ V6.F.open = V6.F.open === a ? '' : a; V6.rerender(); },
    v6Go: function(a){ var p = a.split(':'); if(p[1]) V6.tab[p[0]] = p[1]; setView(p[0]); },
    v6SetNum: async function(a){ var p = a.split(':'), key = p[0], min = +p[1], max = +p[2], el = document.getElementById('v6n-' + key), v = Number(el && el.value);
      if(!isFinite(v) || v < min || v > max) return toast('Valeur attendue entre ' + min + ' et ' + max + '.', 'err');
      if(await V6.setSetting(key, v)) V6.rerender(); }
  });

  /* ======================= PIXELS ET INTÉGRATIONS ======================= */
  V6.PROVIDERS = [
    { id: 'metaPixel', name: 'Meta Pixel', sub: 'Facebook / Instagram', ab: 'f', col: '#1877f2', cat: 'marketing', re: /^[0-9]{6,20}$/, ph: '1234567890123456', help: 'Identifiant du Pixel (chiffres).', desc: 'Mesure les visites et achats pour vos publicités Facebook et Instagram. La Conversions API (envoi serveur) nécessite un jeton d\'accès à enregistrer côté serveur.', capi: 'Conversions API : jeton serveur requis (non configuré)' },
    { id: 'ga4', name: 'Google Analytics 4', sub: 'Statistiques de trafic', ab: 'G', col: '#e37400', cat: 'analytics', re: /^G-[A-Z0-9]{4,14}$/, ph: 'G-XXXXXXXXXX', help: 'ID de mesure commençant par G-.', desc: 'Suit les visiteurs, les pages vues et les achats dans Google Analytics.' },
    { id: 'gtm', name: 'Google Tag Manager', sub: 'Gestionnaire de balises', ab: 'GTM', col: '#246fdb', cat: 'analytics', re: /^GTM-[A-Z0-9]{4,10}$/, ph: 'GTM-XXXXXXX', help: 'ID de conteneur commençant par GTM-.', desc: 'Charge vos autres balises depuis Google. Évitez de doubler GA4 / Ads si elles sont déjà dans le conteneur.' },
    { id: 'gads', name: 'Google Ads', sub: 'Conversions publicitaires', ab: 'Ads', col: '#34a853', cat: 'marketing', re: /^AW-[0-9]{6,14}$/, ph: 'AW-123456789', help: 'ID de conversion commençant par AW-.', desc: 'Mesure les conversions de vos campagnes Google Ads.' },
    { id: 'tiktok', name: 'TikTok Pixel', sub: 'TikTok for Business', ab: 'Tk', col: '#111', cat: 'marketing', re: /^[A-Z0-9]{8,30}$/, ph: 'C1234567890ABCDEF', help: 'Code du Pixel (majuscules et chiffres).', desc: 'Mesure les visites et achats issus de vos publicités TikTok. Events API (serveur) : jeton requis (non configuré).' },
    { id: 'pinterest', name: 'Pinterest Tag', sub: 'Pinterest Ads', ab: 'P', col: '#e60023', cat: 'marketing', re: /^[0-9]{8,20}$/, ph: '2612345678901', help: 'Identifiant de la balise (chiffres).', desc: 'Mesure les visites et achats pour vos épingles et publicités Pinterest.' },
    { id: 'linkedin', name: 'LinkedIn Insight Tag', sub: 'LinkedIn Ads', ab: 'in', col: '#0a66c2', cat: 'marketing', re: /^[0-9]{5,12}$/, ph: '1234567', help: 'Identifiant de partenaire (chiffres).', desc: 'Mesure les conversions et audiences de vos campagnes LinkedIn.' },
    { id: 'snapchat', name: 'Snap Pixel', sub: 'Snapchat Ads', ab: 'S', col: '#c9a800', cat: 'marketing', re: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, ph: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', help: 'Identifiant du Pixel (UUID).', desc: 'Mesure les visites et achats issus de Snapchat.' },
    { id: 'clarity', name: 'Microsoft Clarity', sub: 'Cartes de chaleur', ab: 'C', col: '#5b5fc7', cat: 'analytics', re: /^[a-z0-9]{8,14}$/, ph: 'abcdefghij', help: 'Identifiant du projet (lettres minuscules et chiffres).', desc: 'Enregistre des cartes de chaleur et des replays anonymisés. Chargé seulement après consentement.' }
  ];
  function chk(id){ try{ var c = JSON.parse(localStorage.getItem('slx_v6_pixchk') || '{}')[id]; return c ? 'Dernière vérification du format : ' + new Date(c).toLocaleString('fr-FR') : 'Format jamais vérifié.'; }catch(e){ return ''; } }
  function igState(p){
    var d = (D().integrations || {})[p.id] || {}, pub = (S.published.integrations || {})[p.id] || {};
    var same = JSON.stringify({ id: d.id || '', e: !!d.enabled }) === JSON.stringify({ id: pub.id || '', e: !!pub.enabled });
    if(!d.id && !pub.id) return ['Non configuré', ''];
    if(!same) return ['Brouillon, non publié', 'warn'];
    return pub.enabled ? ['Publié, actif', 'ok'] : ['Publié, désactivé', ''];
  }
  function pixTab(){
    var ig = D().integrations || {}, rc = ig.requireConsent !== false;
    var unpublished = JSON.stringify(D().integrations || {}) !== JSON.stringify(S.published.integrations || {});
    return '<div class="v6-note"><b>Identifiants publics uniquement.</b> Saisissez l\'identifiant du pixel ou de la balise, jamais un jeton d\'API, une clé secrète ou un mot de passe : le site public est lisible par tout le monde. Rien n\'est chargé tant que l\'intégration n\'est pas <b>activée</b> et <b>publiée</b>' + (rc ? ', ni avant l\'accord du visiteur' : '') + '. <b>Non testé en conditions réelles</b> : après publication, vérifiez avec l\'outil officiel de chaque plateforme (Meta Pixel Helper, Tag Assistant, etc.).</div>' +
      '<label class="v6-switch"><input type="checkbox" data-v6c="consent"' + (rc ? ' checked' : '') + '> Demander le consentement des visiteurs avant de charger ces outils</label>' + (rc ? '' : '<p class="hint warn">Sans bandeau de consentement, vous restez responsable de la conformité (RGPD / ePrivacy).</p>') +
      '<div class="v6-prov">' + V6.PROVIDERS.map(function(p){ var it = ig[p.id] || {}, st = igState(p), bad = it.id && !p.re.test(it.id);
        return '<div class="v6-card"><div class="v6-card-h"><span class="v6-logo" style="background:' + p.col + '" aria-hidden="true">' + h(p.ab) + '</span><b>' + h(p.name) + '<small>' + h(p.sub) + '</small></b>' + badge(st[0], st[1]) + '</div><p class="hint">' + h(p.desc) + '</p>' + (p.capi ? '<p class="hint warn">' + h(p.capi) + '</p>' : '') + '<div class="field"><label for="v6i-' + p.id + '">Identifiant public</label><input id="v6i-' + p.id + '" value="' + h(it.id || '') + '" placeholder="' + h(p.ph) + '" autocomplete="off" spellcheck="false" data-v6c="pid" data-p="' + p.id + '"><small class="hint' + (bad ? ' warn' : '') + '">' + (bad ? 'Format invalide. ' : '') + h(p.help) + ' Catégorie de consentement : ' + (p.cat === 'analytics' ? 'mesure' : 'publicité') + '.</small></div>' +
        '<div class="v6-row"><label class="v6-switch"><input type="checkbox" data-v6c="pen" data-p="' + p.id + '"' + (it.enabled ? ' checked' : '') + '> Activer</label><button type="button" class="btn ghost" data-act="v6PixTest" data-arg="' + p.id + '">Vérifier le format</button><button type="button" class="btn ghost" data-act="v6PixDel" data-arg="' + p.id + '">Supprimer</button></div></div>'; }).join('') + '</div>' +
      '<p class="hint">Chaque outil est indépendant : activable, désactivable et chargé séparément, jamais avant l\'accord du visiteur, sans donnée personnelle (e-mail, téléphone, adresse) transmise par ce site.</p>' +
      '<div class="v6-row sticky"><button type="button" class="btn" data-act="v6PixSave">Enregistrer le brouillon</button><button type="button" class="btn gold" data-act="v6PixPublish">Publier les intégrations</button>' + (unpublished ? badge('modifications non publiées', 'warn') : '') + '</div>';
  }
  function ig(){ var d = D(); if(!d.integrations || typeof d.integrations !== 'object') d.integrations = {}; return d.integrations; }
  Object.assign(ACT_EXTRA, {
    v6PixTest: function(a){ try{ var c = JSON.parse(localStorage.getItem('slx_v6_pixchk') || '{}'); c[a] = new Date().toISOString(); localStorage.setItem('slx_v6_pixchk', JSON.stringify(c)); }catch(e){} setTimeout(function(){ V6.rerender(); }, 50); var p = V6.PROVIDERS.find(function(x){ return x.id === a; }), v = (ig()[a] || {}).id || ''; if(!v) return toast('Aucun identifiant à vérifier.', 'err'); toast(p.re.test(v) ? 'Format valide (la réception réelle des données se vérifie avec l\'outil officiel de la plateforme).' : 'Format invalide pour ' + h(p.name) + '.', p.re.test(v) ? '' : 'err'); },
    v6PixDel: async function(a){ if(!await confirmDlg('Supprimer l\'intégration', 'Effacer l\'identifiant de cette intégration du brouillon ? Rien ne change sur le site tant que vous ne publiez pas.', 'Supprimer', 'danger')) return; delete ig()[a]; await commit('Intégration retirée du brouillon.'); V6.rerender(); },
    v6PixSave: async function(){ await commit('Intégrations enregistrées (brouillon, non publiées).'); V6.rerender(); },
    v6PixPublish: async function(){
      var bad = V6.PROVIDERS.filter(function(p){ var it = ig()[p.id]; return it && it.id && !p.re.test(it.id); });
      if(bad.length) return toast('Identifiant invalide : ' + bad.map(function(p){ return h(p.name); }).join(', ') + '.', 'err');
      if(!await confirmDlg('Publier les intégrations', 'Les outils activés seront chargés sur le site public' + (ig().requireConsent === false ? ' <b>sans demander le consentement</b>' : ' après accord du visiteur') + '. Continuer ?', 'Publier', 'dark')) return;
      await persist(); await publishPart(function(p){ p.integrations = JSON.parse(JSON.stringify(D().integrations || {})); }, 'Intégrations publiées'); V6.rerender();
    }
  });

  /* ======================= PRÉFÉRENCES GÉNÉRALES ======================= */
  function prefTab(){
    var p = V6.cfg.mgr_prefs;
    return '<div class="v6-card"><div class="form-grid"><div class="field"><label for="v6-dens">Densité de l\'interface</label><select id="v6-dens" data-v6c="pref" data-k="density">' + [['compact', 'Compacte'], ['normal', 'Normale'], ['large', 'Large (confort tactile)']].map(function(o){ return '<option value="' + o[0] + '"' + (p.density === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div><div class="field"><label for="v6-sv">Rubrique affichée à l\'ouverture</label><select id="v6-sv" data-v6c="pref" data-k="startView">' + [['', 'Par défaut'], ['home', 'Accueil'], ['products', 'Produits'], ['orders', 'Commandes'], ['carts', 'Paniers'], ['details', 'DÉTAILS'], ['settings', 'PARAMÈTRES']].map(function(o){ return '<option value="' + o[0] + '"' + (p.startView === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div></div>' +
      '<label class="v6-switch"><input type="checkbox" data-v6c="prefb" data-k="reduceMotion"' + (p.reduceMotion ? ' checked' : '') + '> Réduire les animations de l\'interface</label><label class="v6-switch"><input type="checkbox" data-v6c="prefb" data-k="hideHints"' + (p.hideHints ? ' checked' : '') + '> Masquer les textes d\'aide</label><p class="hint" id="v6-prefs-st">' + h(V6.syncLabel('mgr_prefs')) + '</p></div>' +
      '<h3 class="se-h">Nouveaux modules et retour arrière</h3><div class="v6-card"><p class="hint" style="margin-top:0">Les rubriques PARAMÈTRES et COULEURS ET ANIMATIONS sont isolées. Pour retrouver exactement le gestionnaire précédent sur cet appareil, utilisez l\'interrupteur ci-dessous (ou ajoutez <code>?v6=off</code> à l\'adresse). Aucune donnée n\'est supprimée.</p><div class="v6-row"><button type="button" class="btn ghost" data-act="v6Off">Masquer les nouveaux modules sur cet appareil</button><button type="button" class="btn ghost" data-act="v6ResetAll">Réinitialiser mes préférences et mon apparence</button></div></div>';
  }
  Object.assign(ACT_EXTRA, {
    v6Off: async function(){ if(!await confirmDlg('Masquer les nouveaux modules', 'Le gestionnaire se rechargera sans PARAMÈTRES ni COULEURS ET ANIMATIONS. Vous pourrez les réactiver avec <code>?v6=on</code>.', 'Masquer', 'dark')) return; try{ localStorage.setItem('slx_v6_off', '1'); }catch(e){} location.reload(); },
    v6ResetAll: async function(){ if(!await confirmDlg('Réinitialiser', 'Rétablir les préférences, le thème et les animations du gestionnaire par défaut ? Les animations de votre bibliothèque personnelle sont conservées.', 'Réinitialiser', 'danger')) return;
      var lib = V6.cfg.mgr_animlib; await V6.save('mgr_prefs', { density: 'normal', startView: '', reduceMotion: false, hideHints: false }); await V6.save('mgr_theme', { preset: 'classic', dark: false, colors: {}, radius: null, font: null, sidebar: null, btn: null }); await V6.save('mgr_anim', { style: 'none', speed: 1, apply: {} }); V6.cfg.mgr_animlib = lib; toast('Préférences réinitialisées.'); V6.rerender(); }
  });
  try{ if(/[?&]v6=on\b/.test(location.search)) localStorage.removeItem('slx_v6_off'); }catch(e){}

  /* ---- changements immédiats (champs) ---- */
  document.addEventListener('input', function(e){ var t = e.target; if(t.dataset && t.dataset.v6c === 'q'){ V6.F.q = t.value; clearTimeout(V6._qt); V6._qt = setTimeout(function(){ V6.rerender(); var q = document.getElementById('v6q'); if(q){ q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }, 200); }
    if(t.dataset && t.dataset.v6c === 'pid'){ var p = t.dataset.p; var it = ig()[p] = ig()[p] || {}; it.id = t.value.trim(); } });
  document.addEventListener('change', async function(e){
    var t = e.target, c = t.dataset && t.dataset.v6c; if(!c) return;
    if(c === 'state' || c === 'sub'){ V6.F[c] = t.value; V6.rerender(); }
    else if(c === 'pen'){ var it = ig()[t.dataset.p] = ig()[t.dataset.p] || {}; it.enabled = t.checked; if(t.checked && !it.id){ it.enabled = false; t.checked = false; toast('Saisissez d\'abord un identifiant.', 'err'); } }
    else if(c === 'pid'){ var pv = V6.PROVIDERS.find(function(x){ return x.id === t.dataset.p; }), hint = t.parentNode.querySelector('.hint'), vv = t.value.trim();
      if(hint){ var badF = vv && !pv.re.test(vv); hint.classList.toggle('warn', !!badF); hint.textContent = (badF ? 'Format invalide. ' : '') + pv.help + ' Catégorie de consentement : ' + (pv.cat === 'analytics' ? 'mesure' : 'publicité') + '.'; }
      var bd = t.closest('.v6-card') && t.closest('.v6-card').querySelector('.v6-badge'); if(bd && vv !== (((S.published.integrations || {})[pv.id] || {}).id || '')){ bd.textContent = 'Brouillon, non publié'; bd.className = 'v6-badge warn'; } }
    else if(c === 'consent'){ ig().requireConsent = t.checked; V6.rerender(); }
    else if(c === 'pref' || c === 'prefb'){ var n = Object.assign({}, V6.cfg.mgr_prefs); n[t.dataset.k] = c === 'prefb' ? t.checked : t.value; var r = await V6.save('mgr_prefs', n); var st = document.getElementById('v6-prefs-st'); if(st) st.textContent = r.ok ? V6.syncLabel('mgr_prefs') : r.error; }
    else if(c === 'bool'){ var k = t.dataset.key; if(k === '@reduceMotion'){ var n2 = Object.assign({}, V6.cfg.mgr_prefs, { reduceMotion: t.checked }); await V6.save('mgr_prefs', n2); V6.rerender(); } else { if(await V6.setSetting(k, t.checked)) V6.rerender(); else t.checked = !t.checked; } }
  });

  V6.settingsBody = function(tab){ return tab === 'features' ? featTab() : tab === 'pixels' ? pixTab() : tab === 'prefs' ? prefTab() : secTab(); };
})();
