/* SEN LUXE v6 — Centre de notifications (messages techniques/administration) + réglage des notifications internes de commande. */
(function(){
  'use strict';
  var V6 = window.V6; if(!V6) return;
  var h = V6.h, cl = function(o){ return JSON.parse(JSON.stringify(o)); };
  var PR = { critical: ['Critique', 0], high: ['Élevée', 1], medium: ['Moyenne', 2], low: ['Faible', 3] };
  var CAT = { systeme: 'Système', stock: 'Stock', commandes: 'Commandes', publication: 'Publication', integrations: 'Intégrations', securite: 'Sécurité' };
  V6.N = { filter: 'new', cat: '', open: '' };
  function safe(f, d){ try{ return f(); }catch(e){ return d; } }

  /* ----- collecte à partir de l'état réel du gestionnaire ----- */
  V6.notifItems = function(){
    var out = [], seen = V6.cfg.v6_notifs.seen || {}, now = Date.now();
    function add(id, pr, cat, title, detail, link, count){ out.push({ id: id, pr: pr, cat: cat, title: title, detail: detail, link: link, ts: seen[id] || now }); }
    if(typeof SALES !== 'undefined' && SALES.error) add('sync:' + SALES.error.slice(0, 30), 'critical', 'systeme', 'Synchronisation des commandes en échec', SALES.error + ' — les commandes affichées peuvent ne pas être à jour.', { view: 'details' });
    if(typeof ADM !== 'undefined' && ADM.state === 'error') add('adm:error', 'critical', 'systeme', 'Connexion au serveur interrompue', 'Le gestionnaire ne parvient plus à joindre le serveur. Vos modifications restent sur cet appareil.', { view: 'details' });
    var prods = safe(function(){ return D().products.filter(function(p){ return p.active !== false && typeof p.stock === 'number'; }); }, []);
    var out0 = prods.filter(function(p){ return p.stock <= 0; }), low = prods.filter(function(p){ return p.stock > 0 && p.stock <= 3; });
    if(out0.length) add('stock0:' + out0.length, 'critical', 'stock', out0.length + ' produit(s) en rupture de stock', out0.slice(0, 8).map(function(p){ return p.name; }).join(', ') + (out0.length > 8 ? '…' : ''), { view: 'products' });
    if(low.length) add('stock-low:' + low.length, 'high', 'stock', low.length + ' produit(s) bientôt épuisés (3 ou moins)', low.slice(0, 8).map(function(p){ return p.name + ' (' + p.stock + ')'; }).join(', '), { view: 'products' });
    var nw = safe(function(){ return SALES.v4 === true ? [].slice.call(SALES.orders.values()).filter(function(o){ return o.status === 'Nouvelle' && !o.archived; }).length : 0; }, 0);
    if(nw) add('orders-new:' + nw, 'high', 'commandes', nw + ' nouvelle(s) commande(s) à traiter', 'Ouvrez la rubrique Commandes pour les confirmer ou les préparer.', { view: 'orders' });
    var pend = safe(function(){ return pendingCount(); }, 0);
    if(pend) add('pending:' + pend, 'medium', 'publication', pend + ' modification(s) non publiée(s)', 'Le site public ne reflète pas encore ces changements. Rien n\'est publié automatiquement.', { view: 'details' });
    var ig = safe(function(){ return JSON.stringify(D().integrations || {}) !== JSON.stringify(S.published.integrations || {}); }, false);
    if(ig) add('integrations:draft', 'medium', 'integrations', 'Intégrations modifiées, non publiées', 'Pixels et outils de mesure : brouillon différent de la version publiée.', { view: 'settings', tab: 'pixels' });
    var nf = V6.cfg.v6_notify; if(!(nf.emails.length || nf.whatsapp.length)) add('notify:none', 'medium', 'systeme', 'Aucun destinataire de notification de commande', 'Ajoutez une adresse e-mail ou un numéro WhatsApp pour être prévenu des nouvelles commandes.', { view: 'settings', tab: 'notify' });
    var ab = safe(function(){ return cartsList().filter(function(c){ return cartState(c) === 'abandonné' && c.item_count > 0; }).length; }, 0);
    if(ab) add('abandoned:' + ab, 'low', 'commandes', ab + ' panier(s) abandonné(s)', 'Clients ayant ajouté des articles sans commander.', { view: 'carts' });
    out.forEach(function(n){ if(!seen[n.id]){ seen[n.id] = n.ts; } });
    out.sort(function(a, b){ return PR[a.pr][1] - PR[b.pr][1] || b.ts - a.ts; });
    return out;
  };
  function state(id){ var s = V6.cfg.v6_notifs; return s.archived[id] ? 'archived' : s.read[id] ? 'read' : 'new'; }
  V6.notifBadge = function(){ var el = document.getElementById('navNotifN'); if(!el) return; var n = V6.notifItems().filter(function(x){ return state(x.id) === 'new' && PR[x.pr][1] <= 1; }).length; el.textContent = n ? String(n) : ''; };
  V6.notifBody = function(){
    var all = V6.notifItems(), N = V6.N, f = N.filter;
    var list = all.filter(function(n){ var st = state(n.id); return (f === 'archived' ? st === 'archived' : f === 'new' ? st === 'new' : st !== 'archived') && (!N.cat || n.cat === N.cat); });
    var cnt = { new: all.filter(function(n){ return state(n.id) === 'new'; }).length, all: all.filter(function(n){ return state(n.id) !== 'archived'; }).length, archived: all.filter(function(n){ return state(n.id) === 'archived'; }).length };
    var tabs = [['new', 'Non lues'], ['all', 'Toutes'], ['archived', 'Archivées']].map(function(t){ return '<button type="button" class="' + (f === t[0] ? 'on' : '') + '" data-act="v6NF" data-arg="' + t[0] + '">' + t[1] + ' (' + cnt[t[0]] + ')</button>'; }).join('');
    var cats = [''].concat(Object.keys(CAT)).map(function(c){ return '<button type="button" class="' + (N.cat === c ? 'on' : '') + '" data-act="v6NC" data-arg="' + c + '">' + (c ? CAT[c] : 'Toutes catégories') + '</button>'; }).join('');
    var rows = list.map(function(n){
      var st = state(n.id), open = N.open === n.id, d = new Date(n.ts);
      return '<div class="v6-notif ' + n.pr + (st === 'new' ? ' unread' : '') + '"><div class="v6-notif-h"><span class="v6-prio ' + n.pr + '">' + PR[n.pr][0] + '</span><b>' + h(n.title) + '</b><small>' + h(CAT[n.cat]) + ' · ' + h(d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })) + (st === 'new' ? ' · non lue' : '') + '</small></div>' +
        (open ? '<p class="v6-notif-d">' + h(n.detail) + '</p>' : '') +
        '<div class="v6-row"><button type="button" class="btn ghost" data-act="v6NOpen" data-arg="' + h(n.id) + '">' + (open ? 'Masquer' : 'Détails') + '</button>' + (n.link ? '<button type="button" class="btn" data-act="v6NGo" data-arg="' + h(n.id) + '">Ouvrir la fonctionnalité</button>' : '') +
        (st === 'archived' ? '<button type="button" class="btn ghost" data-act="v6NArch" data-arg="' + h(n.id) + '">Restaurer</button>' : '<button type="button" class="btn ghost" data-act="v6NRead" data-arg="' + h(n.id) + '">' + (st === 'new' ? 'Marquer comme lue' : 'Marquer non lue') + '</button><button type="button" class="btn ghost" data-act="v6NArch" data-arg="' + h(n.id) + '">Archiver</button>') + '</div></div>';
    }).join('') || '<p class="muted">Aucune notification dans cette vue.</p>';
    return '<div class="v6-sub">Messages techniques et d\'administration (synchronisation, stock, publication, sécurité). <b>Classés par priorité</b> — critique, élevée, moyenne, faible — puis du plus récent au plus ancien, quelle que soit l\'heure d\'arrivée. Les conversations et messages clients restent dans Commandes.</div><div class="v6-cats">' + tabs + '</div><div class="v6-cats">' + cats + '</div>' + rows +
      (cnt.new ? '<div class="v6-row"><button type="button" class="btn ghost" data-act="v6NAllRead">Tout marquer comme lu</button></div>' : '');
  };
  async function upd(fn){ var s = cl(V6.cfg.v6_notifs); fn(s); await V6.save('v6_notifs', s); V6.notifBadge(); V6.rerender(); }
  var A = ACT_EXTRA;
  Object.assign(A, {
    v6NF: function(a){ V6.N.filter = a; V6.rerender(); }, v6NC: function(a){ V6.N.cat = a; V6.rerender(); },
    v6NOpen: function(a){ V6.N.open = V6.N.open === a ? '' : a; V6.rerender(); },
    v6NGo: function(a){ var n = V6.notifItems().find(function(x){ return x.id === a; }); if(!n) return; upd(function(s){ s.read[a] = 1; }); if(n.link.tab) V6.tab[n.link.view] = n.link.tab; setView(n.link.view); },
    v6NRead: function(a){ upd(function(s){ if(s.read[a]) delete s.read[a]; else s.read[a] = 1; }); },
    v6NArch: function(a){ upd(function(s){ if(s.archived[a]) delete s.archived[a]; else { s.archived[a] = 1; s.read[a] = 1; } }); },
    v6NAllRead: function(){ var ids = V6.notifItems().map(function(n){ return n.id; }); upd(function(s){ ids.forEach(function(i){ s.read[i] = 1; }); }); }
  });

  /* ======== Notifications de commande (e-mail / WhatsApp) ======== */
  var EMAIL = /^[^\s@<>"]{1,64}@[^\s@<>"]{1,190}\.[a-z]{2,}$/i, PHONE = /^\+[1-9][0-9]{7,14}$/;
  V6.normPhone = function(v){ v = String(v).replace(/[\s().-]/g, ''); if(v.indexOf('00') === 0) v = '+' + v.slice(2); return v; };
  function listHtml(kind){
    var nf = V6.cfg.v6_notify, arr = nf[kind];
    return (arr.length ? arr.map(function(v, i){ return '<div class="v6-recip"><input value="' + h(v) + '" data-v6n="edit" data-k="' + kind + '" data-i="' + i + '" aria-label="' + (kind === 'emails' ? 'Adresse e-mail' : 'Numéro WhatsApp') + '" autocomplete="off"><button type="button" class="btn ghost" data-act="v6NTest" data-arg="' + kind + ':' + i + '">Envoyer un test</button><button type="button" class="btn ghost danger" data-act="v6NDel" data-arg="' + kind + ':' + i + '">Supprimer</button></div>'; }).join('') : '<p class="hint">Aucun destinataire.</p>') +
      '<div class="v6-recip"><input id="v6n-new-' + kind + '" placeholder="' + (kind === 'emails' ? 'prenom@exemple.com' : '+221 77 000 00 00') + '" autocomplete="off" inputmode="' + (kind === 'emails' ? 'email' : 'tel') + '"><button type="button" class="btn" data-act="v6NAdd" data-arg="' + kind + '">Ajouter</button></div>';
  }
  V6.notifyTab = function(){
    var nf = V6.cfg.v6_notify, lt = nf.lastTest;
    return '<div class="v6-note"><b>Confidentialité.</b> Ces adresses et numéros sont réservés à l\'équipe : ils sont enregistrés côté administration et ne sont jamais publiés ni visibles des clients. <b>Statut de l\'envoi :</b> l\'envoi réel passe par la fonction serveur <code>senluxe-notify</code> (e-mail Resend, API WhatsApp Business officielle). Tant qu\'elle n\'est pas déployée avec ses clés secrètes, les tests affichent une erreur claire — aucun faux succès.' + (lt ? '<br><b>Dernier test :</b> ' + h(lt.channel) + ' — ' + (lt.ok ? '✓ envoyé' : '✕ ' + h(lt.error)) + ' (' + h(new Date(lt.at).toLocaleString('fr-FR')) + ')' : '') + '</div>' +
      '<h3 class="se-h">Adresses e-mail</h3>' + listHtml('emails') + '<h3 class="se-h">Numéros WhatsApp (format international)</h3>' + listHtml('whatsapp') +
      '<h3 class="se-h">Événements notifiés</h3><label class="v6-switch"><input type="checkbox" data-v6n="ev" data-k="order"' + (nf.events.order ? ' checked' : '') + '> Nouvelle commande</label><label class="v6-switch"><input type="checkbox" data-v6n="ev" data-k="stock"' + (nf.events.stock ? ' checked' : '') + '> Rupture de stock</label>' +
      '<p class="hint">Les envois automatiques à chaque commande demandent un déclencheur serveur (webhook de base de données) à brancher une fois la fonction déployée ; aucun message n\'est envoyé depuis cette page en dehors des tests que vous lancez.</p>';
  }
  async function saveNf(fn, msg){ var s = cl(V6.cfg.v6_notify); fn(s); var r = await V6.save('v6_notify', s); toast(r.ok ? msg : 'Enregistré sur cet appareil ; erreur serveur : ' + h(r.error), r.ok ? '' : 'err'); V6.rerender(); V6.notifBadge(); }
  Object.assign(A, {
    v6NAdd: function(k){ var el = document.getElementById('v6n-new-' + k), v = k === 'whatsapp' ? V6.normPhone(el.value) : el.value.trim();
      if(!(k === 'emails' ? EMAIL.test(v) : PHONE.test(v))) return toast(k === 'emails' ? 'Adresse e-mail invalide.' : 'Numéro invalide : format international attendu (ex. +221770000000).', 'err');
      if(V6.cfg.v6_notify[k].indexOf(v) >= 0) return toast('Déjà dans la liste.', 'err'); if(V6.cfg.v6_notify[k].length >= 10) return toast('10 destinataires maximum.', 'err');
      saveNf(function(s){ s[k].push(v); }, 'Destinataire ajouté.'); },
    v6NDel: async function(a){ var p = a.split(':'); if(!await confirmDlg('Supprimer le destinataire', 'Il ne recevra plus de notifications.', 'Supprimer', 'danger')) return; saveNf(function(s){ s[p[0]].splice(+p[1], 1); }, 'Destinataire supprimé.'); },
    v6NTest: async function(a){
      var p = a.split(':'), k = p[0], to = V6.cfg.v6_notify[k][+p[1]], ch = k === 'emails' ? 'email' : 'whatsapp', c = anCfg(), res;
      toast('Envoi du test…');
      try{ var r = await fetch(c.url + '/functions/v1/senluxe-notify', { method: 'POST', headers: { apikey: c.anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ token: ADM.pass, channel: ch, to: to, subject: 'SEN LUXE — test de notification', text: 'Test SEN LUXE : la notification fonctionne.' }) }); var j = null; try{ j = await r.json(); }catch(e){}
        res = r.ok && j && j.ok ? { ok: true } : { ok: false, error: r.status === 404 ? 'Fonction serveur « senluxe-notify » non déployée (aucun message envoyé).' : (j && j.error) || ('Erreur ' + r.status) };
      }catch(e){ res = { ok: false, error: 'Serveur injoignable (' + e.message + ')' }; }
      toast(res.ok ? 'Test envoyé à ' + h(to) + '.' : 'Échec : ' + h(res.error), res.ok ? '' : 'err');
      await saveNf(function(s){ s.lastTest = { channel: ch === 'email' ? 'e-mail' : 'WhatsApp', ok: res.ok, error: res.error || '', at: new Date().toISOString() }; }, res.ok ? 'Test enregistré.' : 'Échec du test enregistré.');
    }
  });
  document.addEventListener('change', function(e){ var t = e.target, m = t.dataset && t.dataset.v6n; if(!m) return;
    if(m === 'ev') saveNf(function(s){ s.events[t.dataset.k] = t.checked; }, 'Préférence enregistrée.');
    if(m === 'edit'){ var k = t.dataset.k, v = k === 'whatsapp' ? V6.normPhone(t.value) : t.value.trim(); if(!(k === 'emails' ? EMAIL.test(v) : PHONE.test(v))){ toast('Valeur invalide, non enregistrée.', 'err'); return V6.rerender(); } saveNf(function(s){ s[k][+t.dataset.i] = v; }, 'Destinataire modifié.'); } });
  var old = V6.settingsBody; V6.settingsBody = function(tab){ return tab === 'notify' ? V6.notifyTab() : old(tab); };
  setInterval(function(){ if(V6.serverLoaded || true) V6.notifBadge(); }, 15000); setTimeout(V6.notifBadge, 2500);
})();
