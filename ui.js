/* Interface de la salle PS5 (iPhone d'abord). S'appuie sur Core (logique) et Store (stockage local). */
(function () {
  'use strict';
  const C = window.Core, fmt = C.fmt, jj = C.jj;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const h = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DA = n => `${fmt(n)} DA`;
  const hm = ts => { const d = new Date(ts); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const isoJour = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const chrono = ms => { const t = Math.floor(ms / 1000); return `${Math.floor(t / 3600)}:${String(Math.floor(t % 3600 / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
  const dureeTxt = m => m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`;
  const initiales = n => String(n).split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase();
  const LS_USER = 'salle-ps5-user';

  let S = null, U = null, vue = 'postes', sousVue = null, panier = [], destBar = 0, alertes = new Set();
  const peut = d => U && U.droits.includes(d);

  // ---------- Icônes ----------
  const I = {
    postes: '<path d="M6 9h4M8 7v4M15 10h.01M18 8h.01M7 5h10a5 5 0 0 1 4.8 6.4l-1.3 4.4A2.5 2.5 0 0 1 16 16l-1-1H9l-1 1a2.5 2.5 0 0 1-4.5-.2L2.2 11.4A5 5 0 0 1 7 5z"/>',
    bar: '<path d="M8 3h8l-1 18H9L8 3zM8 8h8"/>',
    caisse: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h3"/>',
    clients: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
    plus: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    tournois: '<path d="M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H4a3 3 0 0 0 4 4M16 6h4a3 3 0 0 1-4 4M12 13v4M8 21h8M9 17h6"/>',
    rapports: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    stock: '<path d="M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10"/>',
    journal: '<path d="M6 3h10l4 4v14H6zM9 9h6M9 13h8M9 17h5"/>',
    reglages: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
    users: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    sauvegarde: '<path d="M12 3v12M7 10l5 5 5-5M4 17v3h16v-3"/>',
    pin: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    sortir: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>'
  };
  const ico = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[k]}</svg>`;

  const VUES = {
    postes: { t: 'Postes', s: 'Suivi en temps réel', d: 'postes', nav: true },
    bar: { t: 'Bar', s: 'Boissons et snacks', d: 'bar', nav: true },
    caisse: { t: 'Caisse', s: '', d: 'caisse', nav: true },
    clients: { t: 'Clients fidèles', s: 'Cartes, heures prépayées, points', d: 'clients', nav: true, court: 'Clients' },
    plus: { t: 'Plus', s: '', nav: true },
    tournois: { t: 'Tournois', s: 'Inscriptions et tableau', d: 'tournois' },
    rapports: { t: 'Rapports', s: "Chiffre d'affaires et occupation", d: 'rapports' },
    stock: { t: 'Stock et produits', s: 'Entrées de stock, prix, seuils', d: 'stock' },
    journal: { t: 'Journal', s: 'Qui a fait quoi', d: 'journal' },
    reglages: { t: 'Réglages', s: 'Salle, postes et tarifs', d: 'params' },
    users: { t: 'Utilisateurs', s: 'Comptes et rôles', d: 'users' },
    sauvegarde: { t: 'Sauvegarde', s: 'Exporter ou restaurer les données' },
    pin: { t: 'Mon code PIN', s: '' }
  };

  // ---------- Outils d'affichage ----------
  let tt;
  function toast(t, err) { const e = $('#toast'); e.textContent = t; e.className = 'toast' + (err ? ' err' : ''); e.hidden = false; clearTimeout(tt); tt = setTimeout(() => e.hidden = true, err ? 3800 : 2200); }
  function modal(html, mount) {
    $('#sheet').innerHTML = html; $('#modal').hidden = false;
    $('#sheet').scrollTop = 0; if (mount) mount($('#sheet'));
    const f = $('#sheet').querySelector('[autofocus]'); if (f && matchMedia('(min-width:700px)').matches) f.focus();
  }
  function fermer() { $('#modal').hidden = true; $('#sheet').innerHTML = ''; }
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal' || e.target.closest('[data-fermer]')) fermer(); });
  function confirmer(titre, texte, libelle, fn, danger = true) {
    modal(`<h2>${h(titre)}</h2><p class="sub">${h(texte)}</p><div class="actions"><button class="btn" data-fermer>Annuler</button><button class="btn ${danger ? 'danger' : 'pri'}" id="cf-ok">${h(libelle)}</button></div>`,
      el => el.querySelector('#cf-ok').onclick = fn);
  }
  const val = id => { const e = document.getElementById(id); return e ? (e.type === 'checkbox' ? e.checked : e.value) : undefined; };

  // Exécute une action métier, enregistre, ré-affiche ; affiche l'erreur sinon
  async function act(fn, ok) {
    try {
      const r = await fn();
      await Store.enregistrer(S);
      if (ok) toast(typeof ok === 'function' ? ok(r) : ok);
      rendre();
      return r ?? true;
    } catch (e) {
      if (!(e instanceof C.ErreurMetier)) console.error(e);
      toast(e.message || 'Erreur', true);
      return false;
    }
  }

  function bip() {
    try {
      const a = new (window.AudioContext || window.webkitAudioContext)();
      [0, .25, .5].forEach(t => { const o = a.createOscillator(), g = a.createGain(); o.frequency.value = 880; o.connect(g); g.connect(a.destination); g.gain.setValueAtTime(.2, a.currentTime + t); g.gain.exponentialRampToValueAtTime(.001, a.currentTime + t + .2); o.start(a.currentTime + t); o.stop(a.currentTime + t + .2); });
    } catch {}
  }

  async function partagerFichier(nom, contenu, type) {
    const blob = new Blob([contenu], { type });
    try {
      const f = new File([blob], nom, { type });
      if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: nom }); return true; }
    } catch (e) { if (e.name === 'AbortError') return false; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nom;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    return true;
  }

  // ---------- Navigation ----------
  function rendreNav() {
    const items = Object.entries(VUES).filter(([k, v]) => v.nav && (!v.d || peut(v.d)));
    const alerte = C.etat(S).alertes_stock > 0 && peut('stock');
    $('#nav').innerHTML = items.map(([k, v]) => `<button data-go="${k}" ${k === vue || (k === 'plus' && !VUES[vue].nav) ? 'aria-current="page"' : ''}><span class="${k === 'plus' && alerte ? 'badge' : ''}">${ico(k)}</span><span>${h(v.court || v.t)}</span></button>`).join('');
    $('#me-nom').textContent = U.nom; $('#me-role').textContent = U.role; $('#me-av').textContent = initiales(U.nom);
    $('#salle-nom').textContent = S.params.salle_nom; document.title = S.params.salle_nom;
  }
  $('#nav').addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) aller(b.dataset.go); });
  $('#back').onclick = () => { if (sousVue) { sousVue = null; rendre(); } else aller('plus'); };
  function aller(v, sv = null) {
    if (VUES[v]?.d && !peut(VUES[v].d)) v = 'postes';
    vue = v; sousVue = sv; $('#view').scrollTop = 0; rendre();
  }

  function rendre() {
    if (!U) return;
    rendreNav();
    const v = VUES[vue];
    $('#titre').textContent = v.t;
    $('#soustitre').textContent = vue === 'caisse' ? caisseSousTitre() : v.s;
    $('#back').hidden = v.nav && !sousVue;
    $('#top-actions').innerHTML = '';
    rendreBanniere();
    ({ postes: vPostes, bar: vBar, caisse: vCaisse, clients: vClients, plus: vPlus, tournois: vTournois, rapports: vRapports, stock: vStock, journal: vJournal, reglages: vReglages, users: vUsers, sauvegarde: vSauvegarde, pin: vPin })[vue]();
  }
  function caisseSousTitre() { const j = C.etat(S).caisse; return j ? `Ouverte le ${jj(j.ouverture)} à ${hm(j.ouverture)}` : 'Caisse fermée'; }
  function rendreBanniere() {
    const b = $('#banner'), e = C.etat(S);
    let msg = '', btn = '';
    if (U.pin_defaut) { msg = 'Vous utilisez le code PIN par défaut (1234). Changez-le pour protéger la caisse.'; btn = '<button class="btn sm" data-go2="pin">Changer</button>'; }
    else if (!e.caisse && peut('caisse') && ['postes', 'bar'].includes(vue)) { msg = 'La caisse est fermée : ouvrez-la pour pouvoir encaisser.'; btn = '<button class="btn sm pri" data-go2="caisse">Ouvrir la caisse</button>'; }
    else if (peut('params') && vue === 'postes' && Date.now() - (S.derniere_sauvegarde || S.cree_le || Date.now()) > 7 * 864e5 && S.sessions.length) { msg = 'Pas de sauvegarde depuis plus de 7 jours.'; btn = '<button class="btn sm" data-go2="sauvegarde">Sauvegarder</button>'; }
    b.hidden = !msg; b.innerHTML = msg ? `<span>${h(msg)}</span>${btn}` : '';
  }
  $('#banner').addEventListener('click', e => { const b = e.target.closest('[data-go2]'); if (b) aller(b.dataset.go2); });

  // ---------- POSTES ----------
  function vPostes() {
    const e = C.etat(S), occ = e.postes.filter(p => p.session).length;
    $('#view').innerHTML = `
      <div class="kpis">
        <div class="kpi"><span>Postes occupés</span><b>${occ}/${e.postes.length}</b></div>
        <div class="kpi"><span>Encaissé aujourd'hui</span><b>${fmt(e.encaisse_jour)} <small>DA</small></b></div>
        <div class="kpi"><span>En cours</span><b>${fmt(e.en_cours)} <small>DA</small></b></div>
        <div class="kpi"><span>Caisse</span><b>${e.caisse ? fmt(e.caisse.solde) + ' <small>DA</small>' : '<small>Fermée</small>'}</b></div>
      </div>
      ${e.postes.length ? `<div class="stations">${e.postes.map(carteposte).join('')}</div>` : `<div class="card empty">Aucun poste. ${peut('params') ? 'Ajoutez vos postes dans Plus › Réglages.' : "Demandez à l'admin d'ajouter les postes."}</div>`}`;
  }
  function carteposte(p) {
    const s = p.session;
    if (!s) return `<div class="st libre"><div class="hd"><span class="nom">${h(p.nom)}</span><span class="pill libre dot">Libre</span></div>
      <div class="meta">${h(p.console)}${p.ecran ? ' · ' + h(p.ecran) : ''} · ${p.manettes} manettes</div>
      <div class="timer">0:00:00</div><div class="bar"><i style="width:0"></i></div>
      <div class="acts"><button class="btn pri full" data-a="start" data-p="${p.id}">Démarrer</button></div></div>`;
    const t = s.tarif, ms = (s.statut === 'pause' ? s.pause_debut : Date.now()) - s.debut - s.pause_total;
    const lim = s.limite_min || 60, pct = t.type === 'heure' ? (ms / 60000 % 60) / 60 * 100 : Math.min(100, ms / 60000 / lim * 100);
    const reste = t.type === 'forfait' ? Math.ceil(lim - ms / 60000) : null;
    const info = [t.libelle, s.client?.nom || s.joueur].filter(Boolean).map(h).join(' · ');
    return `<div class="st ${s.statut === 'pause' ? 'pause' : 'occupe'}${s.depasse ? ' alerte' : ''}">
      <div class="hd"><span class="nom">${h(p.nom)}</span><span class="pill ${s.statut === 'pause' ? 'pause' : 'occupe'} dot">${s.statut === 'pause' ? 'Pause' : 'Occupé'}</span></div>
      <div class="meta">${info}${s.happy ? ' · <b>Happy hour</b>' : ''}</div>
      <div class="timer" data-timer="${s.id}">${chrono(ms)}</div>
      <div class="bar"><i style="width:${pct.toFixed(1)}%"></i></div>
      <div class="amt"><span class="muted">${reste !== null ? (reste > 0 ? `Reste ${dureeTxt(reste)}` : `<span class="low">Dépassé de ${dureeTxt(-reste)}</span>`) : t.type === 'match' ? `${Math.max(1, Math.ceil(s.minutes / lim))} match(s)` : 'Jeu ' + DA(s.jeu)}${s.bar ? ' · Bar ' + DA(s.bar) : ''}</span><b>${DA(s.total)}</b></div>
      <div class="acts"><button class="btn sm" data-a="pause" data-s="${s.id}">${s.statut === 'pause' ? 'Reprendre' : 'Pause'}</button>
      <button class="btn sm" data-a="bar" data-s="${s.id}">+ Bar</button><button class="btn sm" data-a="plus" data-s="${s.id}">Options</button>
      <button class="btn ok full" data-a="pay" data-s="${s.id}">Encaisser</button></div></div>`;
  }
  $('#view').addEventListener('click', e => {
    const b = e.target.closest('[data-a]'); if (!b || vue !== 'postes') return;
    const sid = Number(b.dataset.s);
    ({ start: () => mDemarrer(Number(b.dataset.p)), pause: () => act(() => C.pause(S, U, sid)), bar: () => { destBar = sid; panier = []; aller('bar'); },
       plus: () => mOptions(sid), pay: () => mEncaisser(sid) })[b.dataset.a]?.();
  });

  function choixClient(prefix, selId) {
    return `<div class="field"><label for="${prefix}-q">Client fidèle (facultatif)</label>
      <input id="${prefix}-q" placeholder="Nom, téléphone ou n° de carte" autocomplete="off" value="${selId ? h(S.clients.find(c => c.id === selId)?.nom) : ''}">
      <input type="hidden" id="${prefix}-id" value="${selId || ''}"><div class="list" id="${prefix}-res"></div></div>`;
  }
  function brancherClient(el, prefix) {
    const q = el.querySelector(`#${prefix}-q`), res = el.querySelector(`#${prefix}-res`), hid = el.querySelector(`#${prefix}-id`);
    q.oninput = () => {
      hid.value = ''; const l = q.value.trim() ? C.clients(S, q.value).slice(0, 5) : [];
      res.innerHTML = l.map(c => `<button class="li" data-c="${c.id}"><span class="grow"><b>${h(c.nom)}</b><small>${h(c.carte)} · ${h(c.tel)}</small></span><span class="end">${dureeTxt(c.minutes_prepayees)}<small>sur la carte</small></span></button>`).join('');
    };
    res.onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; const c = S.clients.find(x => x.id === +b.dataset.c); hid.value = c.id; q.value = c.nom; res.innerHTML = ''; };
  }
  function mDemarrer(pid) {
    const p = S.postes.find(x => x.id === pid), tarifs = C.etat(S).tarifs;
    if (!tarifs.length) return toast("Aucun tarif. L'admin doit en créer dans Réglages.", true);
    let sel = tarifs[0].id;
    modal(`<h2>Démarrer ${h(p.nom)}</h2><div class="sub">${h(p.console)} · ${h(p.ecran)} · ${p.manettes} manettes</div>
      <div class="field"><span class="lbl">Formule</span><div class="opts">${tarifs.map(t => `<button class="opt" data-t="${t.id}" aria-pressed="${t.id === sel}"><b>${h(t.libelle)}</b><span>${DA(t.prix)} ${t.type === 'heure' ? '/ heure' : t.type === 'match' ? `/ match (${t.duree_min} min)` : `· ${dureeTxt(t.duree_min)}`}</span></button>`).join('')}</div></div>
      ${choixClient('dm')}
      <div class="field"><label for="dm-j">Nom du joueur (si pas client fidèle)</label><input id="dm-j" maxlength="60" autocomplete="off"></div>
      <div class="actions"><button class="btn" data-fermer>Annuler</button><button class="btn pri" id="dm-ok">Démarrer le chrono</button></div>`, el => {
      el.querySelectorAll('.opt').forEach(o => o.onclick = () => { sel = +o.dataset.t; el.querySelectorAll('.opt').forEach(x => x.setAttribute('aria-pressed', x === o)); });
      brancherClient(el, 'dm');
      el.querySelector('#dm-ok').onclick = async () => { if (await act(() => C.demarrer(S, U, { poste_id: pid, tarif_id: sel, client_id: val('dm-id') || null, joueur: val('dm-j') }), `${p.nom} démarré`)) fermer(); };
    });
  }
  function mOptions(sid) {
    const s = C.apercu(S, sid), libres = C.etat(S).postes.filter(p => !p.session), tarifs = C.etat(S).tarifs;
    modal(`<h2>${h(s.poste.nom)} · options</h2><div class="sub">${h(s.tarif.libelle)} · démarré à ${hm(s.debut)}</div>
      ${s.lignes.length ? `<span class="lbl">Bar sur la note</span><ul class="ticket">${s.lignes.map(v => `<li><span>${v.qte} × ${h(v.produit)}</span><span class="num">${DA(v.qte * v.prix)} <button class="x" data-rm="${v.id}" aria-label="Retirer">×</button></span></li>`).join('')}</ul>` : ''}
      <div class="field"><label for="op-p">Changer de poste</label><div class="row"><select id="op-p" class="grow">${libres.map(p => `<option value="${p.id}">${h(p.nom)}</option>`).join('') || '<option value="">Aucun poste libre</option>'}</select><button class="btn" id="op-p-ok" ${libres.length ? '' : 'disabled'}>Déplacer</button></div></div>
      <div class="field"><label for="op-t">Changer de formule</label><div class="row"><select id="op-t" class="grow">${tarifs.map(t => `<option value="${t.id}" ${t.id === s.tarif_id ? 'selected' : ''}>${h(t.libelle)}</option>`).join('')}</select><button class="btn" id="op-t-ok">Appliquer</button></div></div>
      ${choixClient('op', s.client_id)}<button class="btn wide" id="op-c-ok">Associer ce client</button>
      ${peut('annuler') ? `<div class="field" style="margin-top:16px"><label for="op-m">Annuler la session (erreur de saisie)</label><input id="op-m" placeholder="Motif obligatoire"></div><button class="btn danger wide" id="op-an">Annuler sans encaisser</button>` : ''}
      <div class="actions" style="margin-top:14px"><button class="btn" data-fermer>Fermer</button></div>`, el => {
      brancherClient(el, 'op');
      el.querySelector('#op-p-ok').onclick = async () => { if (await act(() => C.changerPoste(S, U, sid, +val('op-p')), 'Session déplacée')) fermer(); };
      el.querySelector('#op-t-ok').onclick = async () => { if (await act(() => C.changerFormule(S, U, sid, +val('op-t')), 'Formule changée')) fermer(); };
      el.querySelector('#op-c-ok').onclick = async () => { if (await act(() => C.associerClient(S, U, sid, +val('op-id') || null), 'Client associé')) fermer(); };
      el.querySelectorAll('[data-rm]').forEach(b => b.onclick = async () => { if (await act(() => C.retirerLigneBar(S, U, +b.dataset.rm), 'Article retiré')) mOptions(sid); });
      const an = el.querySelector('#op-an'); if (an) an.onclick = async () => { if (await act(() => C.annuler(S, U, sid, val('op-m')), 'Session annulée')) fermer(); };
    });
  }
  function mEncaisser(sid) {
    const s = C.apercu(S, sid); let mode = 'Espèces';
    const cl = s.client;
    const modes = ['Espèces', ...(cl ? ['Heures prépayées', 'Crédit'] : [])];
    modal(`<h2>Encaisser ${h(s.poste.nom)}</h2><div class="sub">${h(s.tarif.libelle)} · ${dureeTxt(s.minutes)} de jeu${cl ? ' · ' + h(cl.nom) : ''}</div>
      <ul class="ticket"><li><span>Temps de jeu${s.happy ? ' (happy hour)' : ''}</span><b class="num">${DA(s.jeu)}</b></li>${s.lignes.map(v => `<li><span>${v.qte} × ${h(v.produit)}</span><span class="num">${DA(v.qte * v.prix)}</span></li>`).join('')}</ul>
      ${modes.length > 1 ? `<div class="seg" id="en-mode" style="margin:10px 0">${modes.map(m => `<button data-m="${m}" aria-pressed="${m === mode}">${m === 'Heures prépayées' ? 'Carte' : m}</button>`).join('')}</div>` : ''}
      <p class="hint" id="en-info"></p>
      ${peut('remise') ? `<div class="field"><label for="en-r">Remise (DA)</label><input id="en-r" inputmode="numeric" placeholder="0"></div>` : ''}
      <div class="total" style="margin:8px 0 12px"><span>À payer</span><span class="num" id="en-tot"></span></div>
      <div class="field" id="en-recu-f"><label for="en-recu">Montant reçu</label><input id="en-recu" inputmode="numeric"></div>
      <p id="en-rendu" style="font-weight:700;margin:0 0 12px"></p>
      <div class="actions"><button class="btn" data-fermer>Annuler</button><button class="btn ok" id="en-ok">Valider et libérer</button></div>`, el => {
      const maj = () => {
        const r = Math.max(0, C.int(val('en-r'))), jeu = mode === 'Heures prépayées' ? 0 : s.jeu, tot = Math.max(0, jeu + s.bar - r);
        el.querySelector('#en-tot').textContent = DA(tot);
        el.querySelector('#en-info').textContent = mode === 'Heures prépayées' ? `${dureeTxt(Math.max(1, s.minutes))} seront déduites de la carte (solde ${dureeTxt(cl.minutes_prepayees)}). Le bar reste à payer.` : mode === 'Crédit' ? `${DA(tot)} seront ajoutés au crédit de ${cl.nom} (déjà dû : ${DA(cl.credit)}).` : '';
        el.querySelector('#en-recu-f').hidden = mode === 'Crédit' || !tot;
        const recu = C.int(val('en-recu'));
        el.querySelector('#en-rendu').textContent = mode !== 'Crédit' && recu ? (recu >= tot ? `À rendre : ${DA(recu - tot)}` : `Manque ${DA(tot - recu)}`) : '';
      };
      el.querySelectorAll('#en-mode button').forEach(b => b.onclick = () => { mode = b.dataset.m; el.querySelectorAll('#en-mode button').forEach(x => x.setAttribute('aria-pressed', x === b)); maj(); });
      ['en-r', 'en-recu'].forEach(id => { const i = el.querySelector('#' + id); if (i) i.oninput = maj; });
      maj();
      el.querySelector('#en-ok').onclick = async () => {
        const r = await act(() => C.encaisser(S, U, sid, { mode, remise: val('en-r') || 0 }), r => `${DA(r.total)} encaissés`);
        if (r) { fermer(); alertes.delete(sid); }
      };
    });
  }

  // ---------- BAR ----------
  function vBar() {
    const e = C.etat(S), occ = e.postes.filter(p => p.session);
    if (destBar && !occ.some(p => p.session.id === destBar)) destBar = 0;
    const prods = S.produits.filter(p => p.actif).sort((a, b) => a.nom.localeCompare(b.nom));
    const q = id => panier.filter(x => x.produit_id === id).reduce((a, x) => a + x.qte, 0);
    const total = panier.reduce((a, x) => a + x.qte * S.produits.find(p => p.id === x.produit_id).prix_vente, 0);
    $('#view').innerHTML = `
      <div class="field"><label for="bar-dest">Ajouter à</label><select id="bar-dest"><option value="0">Vente comptoir (payée tout de suite)</option>${occ.map(p => `<option value="${p.session.id}" ${p.session.id === destBar ? 'selected' : ''}>${h(p.nom)} · ajouter à la note</option>`).join('')}</select></div>
      ${prods.length ? `<div class="prods">${prods.map(p => `<button class="prod${p.stock <= 0 ? ' rupture' : ''}" data-p="${p.id}">${q(p.id) ? `<span class="q">${q(p.id)}</span>` : ''}<b>${h(p.nom)}</b><span class="p num">${DA(p.prix_vente)}</span><small class="${p.seuil && p.stock <= p.seuil ? 'low' : ''}">Stock ${p.stock}</small></button>`).join('')}</div>` : `<div class="card empty">Aucun produit. ${peut('stock') ? 'Ajoutez-en dans Plus › Stock.' : ''}</div>`}
      <div class="cartbar">
        ${panier.length ? `<ul class="ticket">${panier.map((x, i) => { const p = S.produits.find(y => y.id === x.produit_id); return `<li><span>${x.qte} × ${h(p.nom)}</span><span class="num">${DA(x.qte * p.prix_vente)} <button class="x" data-rmp="${i}" aria-label="Retirer">×</button></span></li>`; }).join('')}</ul>` : '<span class="muted">Touchez un produit pour l\'ajouter.</span>'}
        <div class="total"><span>Total</span><span class="num">${DA(total)}</span></div>
        <div class="actions" style="margin:0"><button class="btn" id="bar-vider" ${panier.length ? '' : 'disabled'}>Vider</button><button class="btn pri" id="bar-ok" ${panier.length ? '' : 'disabled'}>${destBar ? 'Ajouter à la note' : 'Encaisser'}</button></div>
      </div>`;
    $('#bar-dest').onchange = () => { destBar = +val('bar-dest'); rendre(); };
    $('#view').querySelectorAll('[data-p]').forEach(b => b.onclick = () => {
      const p = S.produits.find(x => x.id === +b.dataset.p);
      if (p.stock - q(p.id) <= 0) toast(`Attention : stock de ${p.nom} à ${p.stock - q(p.id)}`, true);
      const l = panier.find(x => x.produit_id === p.id); l ? l.qte++ : panier.push({ produit_id: p.id, qte: 1 }); rendre();
    });
    $('#view').querySelectorAll('[data-rmp]').forEach(b => b.onclick = () => { const l = panier[+b.dataset.rmp]; l.qte > 1 ? l.qte-- : panier.splice(+b.dataset.rmp, 1); rendre(); });
    $('#bar-vider').onclick = () => { panier = []; rendre(); };
    $('#bar-ok').onclick = async () => {
      const dest = destBar, items = panier.slice();
      panier = [];
      const r = await act(() => C.venteBar(S, U, { session_id: dest || null, items }), r => dest ? 'Ajouté à la note' : `${DA(r.total)} encaissés`);
      if (!r) { panier = items; rendre(); } else if (dest) { destBar = 0; aller('postes'); }
    };
  }

  // ---------- STOCK ----------
  function vStock() {
    const prods = S.produits.filter(p => p.actif).sort((a, b) => a.nom.localeCompare(b.nom));
    const val0 = prods.reduce((a, p) => a + Math.max(0, p.stock) * p.prix_achat, 0);
    $('#view').innerHTML = `
      <div class="kpis"><div class="kpi"><span>Produits</span><b>${prods.length}</b></div><div class="kpi"><span>Valeur du stock</span><b>${fmt(val0)} <small>DA</small></b></div>
      <div class="kpi"><span>Sous le seuil</span><b class="${prods.some(p => p.seuil && p.stock <= p.seuil) ? 'low' : ''}">${prods.filter(p => p.seuil && p.stock <= p.seuil).length}</b></div><div class="kpi"><span>Stock négatif</span><b>${prods.filter(p => p.stock < 0).length}</b></div></div>
      <div class="card"><h2>Produits <button class="btn sm pri act" id="pr-new">+ Nouveau</button></h2><div class="list">
      ${prods.map(p => `<div class="li"><span class="grow"><b>${h(p.nom)}</b><small>Vente ${DA(p.prix_vente)} · achat ${DA(p.prix_achat)} · marge ${DA(p.prix_vente - p.prix_achat)}</small></span>
        <span class="end ${p.stock < 0 || (p.seuil && p.stock <= p.seuil) ? 'low' : ''}">${p.stock}<small>seuil ${p.seuil || '—'}</small></span>
        <button class="btn sm" data-in="${p.id}">Entrée</button><button class="btn sm" data-ed="${p.id}">Modifier</button></div>`).join('') || '<div class="empty">Aucun produit</div>'}</div></div>
      <div class="card" style="margin-top:14px"><h2>Derniers mouvements de stock</h2><div class="list">
      ${S.mvt_stock.slice(-30).reverse().map(m => `<div class="li"><span class="grow"><b>${h(m.produit)}</b><small>${jj(m.date)} ${hm(m.date)} · ${h(m.motif)}</small></span><span class="end ${m.qte > 0 ? 'pos' : 'low'}">${m.qte > 0 ? '+' : ''}${m.qte}</span></div>`).join('') || '<div class="empty">Aucune entrée de stock pour le moment</div>'}</div></div>`;
    $('#pr-new').onclick = () => mProduit();
    $$('[data-in]').forEach(b => b.onclick = () => mEntree(+b.dataset.in));
    $$('[data-ed]').forEach(b => b.onclick = () => mProduit(+b.dataset.ed));
  }
  function mEntree(id) {
    const p = S.produits.find(x => x.id === id);
    modal(`<h2>Entrée de stock</h2><div class="sub">${h(p.nom)} · stock actuel ${p.stock}</div>
      <div class="seg" id="es-type" style="margin-bottom:12px"><button data-t="+" aria-pressed="true">Réception</button><button data-t="-" aria-pressed="false">Correction / perte</button></div>
      <div class="fields2"><div class="field"><label for="es-q">Quantité (pièces)</label><input id="es-q" inputmode="numeric" autofocus></div>
      <div class="field"><label for="es-pa">Prix d'achat unitaire</label><input id="es-pa" inputmode="numeric" value="${p.prix_achat}"></div></div>
      <div class="field"><label for="es-m">Motif</label><input id="es-m" placeholder="Réception fournisseur"></div>
      <div class="actions"><button class="btn" data-fermer>Annuler</button><button class="btn pri" id="es-ok">Enregistrer</button></div>`, el => {
      let sg = '+';
      el.querySelectorAll('#es-type button').forEach(b => b.onclick = () => { sg = b.dataset.t; el.querySelectorAll('#es-type button').forEach(x => x.setAttribute('aria-pressed', x === b)); el.querySelector('#es-m').placeholder = sg === '+' ? 'Réception fournisseur' : 'Casse, périmé, inventaire…'; });
      el.querySelector('#es-ok').onclick = async () => { const q = Math.abs(C.int(val('es-q'))); if (await act(() => C.mouvementStock(S, U, id, { qte: sg === '+' ? q : -q, prix_achat: sg === '+' ? val('es-pa') : 0, motif: val('es-m') }), 'Stock mis à jour')) fermer(); };
    });
  }
  function mProduit(id) {
    const p = id ? S.produits.find(x => x.id === id) : { nom: '', prix_vente: '', prix_achat: '', stock: '', seuil: '' };
    modal(`<h2>${id ? 'Modifier le produit' : 'Nouveau produit'}</h2><div class="sub">${id ? `Stock actuel ${p.stock} (utilisez « Entrée » pour le modifier)` : ''}</div>
      <div class="field"><label for="pr-n">Nom</label><input id="pr-n" value="${h(p.nom)}" maxlength="40"></div>
      <div class="fields2"><div class="field"><label for="pr-v">Prix de vente</label><input id="pr-v" inputmode="numeric" value="${p.prix_vente}"></div>
      <div class="field"><label for="pr-a">Prix d'achat</label><input id="pr-a" inputmode="numeric" value="${p.prix_achat}"></div>
      ${id ? '' : `<div class="field"><label for="pr-s">Stock de départ</label><input id="pr-s" inputmode="numeric" value="0"></div>`}
      <div class="field"><label for="pr-se">Seuil d'alerte</label><input id="pr-se" inputmode="numeric" value="${p.seuil}"></div></div>
      <div class="actions"><button class="btn" data-fermer>Annuler</button>${id ? '<button class="btn danger" id="pr-del">Supprimer</button>' : ''}<button class="btn pri" id="pr-ok">Enregistrer</button></div>`, el => {
      el.querySelector('#pr-ok').onclick = async () => { if (await act(() => C.enregistrerProduit(S, U, { id, nom: val('pr-n'), prix_vente: val('pr-v'), prix_achat: val('pr-a'), stock: val('pr-s'), seuil: val('pr-se') }), 'Produit enregistré')) fermer(); };
      const d = el.querySelector('#pr-del'); if (d) d.onclick = () => confirmer('Supprimer ce produit ?', `${p.nom} ne sera plus proposé au bar. L'historique des ventes est conservé.`, 'Supprimer', async () => { if (await act(() => C.supprimerProduit(S, U, id), 'Produit supprimé')) fermer(); });
    });
  }

  // ---------- CAISSE ----------
  function vCaisse() {
    const c = C.caisse(S), j = c.journee, ouverte = j && !j.cloture;
    if (!ouverte) {
      $('#view').innerHTML = `<div class="card"><h2>Ouvrir la caisse</h2>
        <div class="field"><label for="cs-f">Fond de caisse (DA)</label><input id="cs-f" inputmode="numeric" value="${c.fond_defaut}"></div>
        <button class="btn pri wide" id="cs-ouv">Ouvrir la caisse</button></div>
        ${j ? `<div class="card" style="margin-top:14px"><h2>Dernière clôture</h2><div class="list">
          <div class="li"><span class="grow">Clôturée le ${jj(j.cloture)} à ${hm(j.cloture)}</span></div>
          <div class="li"><span class="grow">Espèces attendues</span><span class="end">${DA(j.theorique)}</span></div>
          <div class="li"><span class="grow">Espèces comptées</span><span class="end">${DA(j.especes_comptees)}</span></div>
          <div class="li"><span class="grow"><b>Écart</b></span><span class="end ${j.ecart ? 'low' : 'pos'}">${j.ecart > 0 ? '+' : ''}${DA(j.ecart)}</span></div></div></div>` : ''}`;
      $('#cs-ouv').onclick = () => act(() => C.ouvrirCaisse(S, U, val('cs-f')), 'Caisse ouverte');
      return;
    }
    $('#view').innerHTML = `
      <div class="kpis"><div class="kpi"><span>Fond</span><b>${fmt(j.fond)} <small>DA</small></b></div><div class="kpi"><span>Entrées espèces</span><b>${fmt(c.entrees)} <small>DA</small></b></div>
      <div class="kpi"><span>Sorties</span><b>${fmt(c.sorties)} <small>DA</small></b></div><div class="kpi"><span>Espèces attendues</span><b>${fmt(c.solde)} <small>DA</small></b></div></div>
      <div class="row" style="margin-bottom:14px"><button class="btn grow" id="cs-dep">− Dépense</button><button class="btn grow" id="cs-ent">+ Entrée</button><button class="btn pri grow" id="cs-clo">Clôturer</button></div>
      ${c.credit ? `<p class="hint" style="margin:-4px 0 12px">Mis à crédit aujourd'hui : ${DA(c.credit)} (non compté dans les espèces).</p>` : ''}
      <div class="card"><h2>Mouvements</h2><div class="list">${c.mouvements.map(m => `<div class="li"><span class="grow"><b>${h(m.libelle)}</b><small>${hm(m.date)} · ${h(m.user)} · ${h(m.mode)}</small></span><span class="end ${m.montant < 0 ? 'low' : ''}">${m.montant > 0 && m.mode === 'Espèces' ? '+' : ''}${DA(m.montant)}</span></div>`).join('') || '<div class="empty">Aucun mouvement depuis l\'ouverture</div>'}</div>
      <p class="hint">Ouverte par ${h(j.user_ouverture_nom)} le ${jj(j.ouverture)} à ${hm(j.ouverture)}</p></div>`;
    const mv = type => modal(`<h2>${type === 'sortie' ? 'Dépense' : 'Entrée'} de caisse</h2><div class="sub">${type === 'sortie' ? 'Achat, glace, gobelets, avance…' : 'Apport d\'espèces dans la caisse'}</div>
      <div class="field"><label for="mv-l">Libellé</label><input id="mv-l" maxlength="80"></div><div class="field"><label for="mv-m">Montant (DA)</label><input id="mv-m" inputmode="numeric"></div>
      <div class="actions"><button class="btn" data-fermer>Annuler</button><button class="btn pri" id="mv-ok">Enregistrer</button></div>`,
      el => el.querySelector('#mv-ok').onclick = async () => { if (await act(() => C.mouvementCaisse(S, U, { type, libelle: val('mv-l'), montant: val('mv-m') }), 'Enregistré')) fermer(); });
    $('#cs-dep').onclick = () => mv('sortie'); $('#cs-ent').onclick = () => mv('entree');
    $('#cs-clo').onclick = () => modal(`<h2>Clôturer la caisse</h2><div class="sub">Comptez les espèces présentes dans la caisse.</div>
      <div class="field"><label for="cl-e">Espèces comptées (DA)</label><input id="cl-e" inputmode="numeric" autofocus></div><p class="hint" id="cl-ec">Espèces attendues : ${DA(c.solde)}</p>
      <div class="actions"><button class="btn" data-fermer>Annuler</button><button class="btn pri" id="cl-ok">Clôturer</button></div>`, el => {
      el.querySelector('#cl-e').oninput = () => { const d = C.int(val('cl-e')) - c.solde; el.querySelector('#cl-ec').innerHTML = `Espèces attendues : ${DA(c.solde)} · écart <b class="${d ? 'low' : 'pos'}">${d > 0 ? '+' : ''}${DA(d)}</b>`; };
      el.querySelector('#cl-ok').onclick = async () => { if (await act(() => C.cloturerCaisse(S, U, val('cl-e')), r => `Caisse clôturée · écart ${DA(r.ecart)}`)) fermer(); };
    });
  }

  // ---------- CLIENTS ----------
  let qClient = '';
  function vClients() {
    const l = C.clients(S, qClient);
    $('#view').innerHTML = `<div class="row" style="margin-bottom:12px"><input class="grow" id="cl-q" type="search" placeholder="Rechercher (nom, téléphone, carte)" value="${h(qClient)}" style="border:1px solid var(--line);background:var(--surface);border-radius:10px;padding:10px 12px;min-height:44px">
      <button class="btn pri" id="cl-new">+ Nouveau</button></div>
      <div class="card"><div class="list">${l.map(c => `<button class="li" data-cl="${c.id}"><span class="av">${h(initiales(c.nom))}</span><span class="grow"><b>${h(c.nom)}</b><small>${h(c.carte)} · ${h(c.tel) || 'pas de téléphone'}${c.credit ? ` · <span class="low">doit ${DA(c.credit)}</span>` : ''}</small></span><span class="end">${dureeTxt(c.minutes_prepayees)}<small>${c.points} pts</small></span></button>`).join('') || `<div class="empty">${qClient ? 'Aucun client trouvé' : 'Aucun client fidèle pour le moment'}</div>`}</div></div>
      <p class="hint">${S.params.points_par_100} point par tranche de 100 DA payée · ${S.params.points_heure_offerte} points = 1 h offerte</p>`;
    const q = $('#cl-q'); q.oninput = () => { qClient = q.value; const pos = q.selectionStart; rendre(); const n = $('#cl-q'); n.focus(); n.setSelectionRange(pos, pos); };
    $('#cl-new').onclick = () => mClientEdit();
    $$('[data-cl]').forEach(b => b.onclick = () => mClient(+b.dataset.cl));
  }
  function mClientEdit(id) {
    const c = id ? S.clients.find(x => x.id === id) : { nom: '', tel: '' };
    modal(`<h2>${id ? 'Modifier le client' : 'Nouveau client fidèle'}</h2><div class="sub">${id ? h(c.carte) : 'Un numéro de carte est attribué automatiquement.'}</div>
      <div class="field"><label for="ce-n">Nom</label><input id="ce-n" value="${h(c.nom)}" maxlength="60"></div>
      <div class="field"><label for="ce-t">Téléphone</label><input id="ce-t" type="tel" value="${h(c.tel)}" maxlength="20"></div>
      <div class="actions"><button class="btn" data-fermer>Annuler</button><button class="btn pri" id="ce-ok">Enregistrer</button></div>`, el => {
      el.querySelector('#ce-ok').onclick = async () => { const r = await act(() => C.enregistrerClient(S, U, { id, nom: val('ce-n'), tel: val('ce-t') }), r => id ? 'Client modifié' : `Carte ${r.carte} créée`); if (r) mClient(r.id); };
    });
  }
  function mClient(id) {
    const c = S.clients.find(x => x.id === id), besoin = C.int(S.params.points_heure_offerte, 100);
    const hist = S.sessions.filter(s => s.client_id === id && s.statut === 'terminee').slice(-5).reverse();
    modal(`<h2>${h(c.nom)}</h2><div class="sub">${h(c.carte)} · ${h(c.tel)}</div>
      <div class="kpis"><div class="kpi"><span>Heures prépayées</span><b>${dureeTxt(c.minutes_prepayees)}</b></div><div class="kpi"><span>Points</span><b>${c.points}</b></div>
      <div class="kpi"><span>Crédit dû</span><b class="${c.credit ? 'low' : ''}">${fmt(c.credit)} <small>DA</small></b></div><div class="kpi"><span>Dernière visite</span><b style="font-size:15px">${c.derniere_visite ? jj(c.derniere_visite) : '—'}</b></div></div>
      <span class="lbl">Recharger des heures</span><div class="fields2"><div class="field"><label for="rc-h">Heures</label><input id="rc-h" inputmode="decimal" placeholder="10"></div><div class="field"><label for="rc-m">Prix payé (DA)</label><input id="rc-m" inputmode="numeric" placeholder="2200"></div></div>
      <button class="btn pri wide" id="rc-ok">Recharger la carte</button>
      ${c.points >= besoin ? `<button class="btn wide" id="rc-pts" style="margin-top:8px">Convertir ${besoin} points en 1 h offerte</button>` : `<p class="hint">Encore ${besoin - c.points} points avant 1 h offerte.</p>`}
      ${c.credit ? `<div class="row" style="margin-top:12px"><input id="rc-cr" class="grow" inputmode="numeric" value="${c.credit}" style="border:1px solid var(--line);background:var(--surface-2);border-radius:10px;padding:10px;min-height:44px"><button class="btn ok" id="rc-cr-ok">Encaisser le crédit</button></div>` : ''}
      ${hist.length ? `<span class="lbl" style="display:block;margin-top:14px">Dernières sessions</span><div class="list">${hist.map(s => `<div class="li"><span class="grow">${jj(s.fin)} · ${h(S.postes.find(p => p.id === s.poste_id)?.nom)}<small>${dureeTxt(s.minutes)} · ${h(s.mode_paiement)}</small></span><span class="end">${DA(s.total)}</span></div>`).join('')}</div>` : ''}
      <div class="actions" style="margin-top:14px"><button class="btn" id="rc-ed">Modifier</button><button class="btn" data-fermer>Fermer</button></div>`, el => {
      el.querySelector('#rc-ok').onclick = async () => { if (await act(() => C.rechargerClient(S, U, id, { heures: val('rc-h'), montant: val('rc-m') }), 'Carte rechargée')) mClient(id); };
      const p = el.querySelector('#rc-pts'); if (p) p.onclick = async () => { if (await act(() => C.convertirPoints(S, U, id), '1 h ajoutée')) mClient(id); };
      const cr = el.querySelector('#rc-cr-ok'); if (cr) cr.onclick = async () => { if (await act(() => C.reglerCredit(S, U, id, val('rc-cr')), 'Crédit encaissé')) mClient(id); };
      el.querySelector('#rc-ed').onclick = () => mClientEdit(id);
    });
  }

  // ---------- PLUS ----------
  function vPlus() {
    const items = ['tournois', 'rapports', 'stock', 'journal', 'reglages', 'users'].filter(k => peut(VUES[k].d));
    const alerte = C.etat(S).alertes_stock;
    $('#view').innerHTML = `<div class="card" style="margin-bottom:14px"><div class="li" style="border:0"><span class="av">${h(initiales(U.nom))}</span><span class="grow"><b>${h(U.nom)}</b><small>${h(U.role)}</small></span></div></div>
      <div class="menu-grid">${items.map(k => `<button class="btn" data-go3="${k}">${ico(k)}<span>${VUES[k].t}${k === 'stock' && alerte ? ` <span class="low">(${alerte})</span>` : ''}</span></button>`).join('')}
      ${peut('params') ? `<button class="btn" data-go3="sauvegarde">${ico('sauvegarde')}<span>Sauvegarde</span></button>` : ''}
      <button class="btn" data-go3="pin">${ico('pin')}<span>Mon code PIN</span></button>
      <button class="btn" id="logout">${ico('sortir')}<span>Changer d'utilisateur</span></button>
      <button class="btn" id="lang" data-notr><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg><span>${window.I18N?.lang === 'ar' ? 'Français' : 'عربي'}</span></button></div>
      <p class="hint" style="text-align:center;margin-top:18px">${h(S.params.salle_nom)} · version 1.0 · données enregistrées sur cet appareil</p>`;
    $$('[data-go3]').forEach(b => b.onclick = () => aller(b.dataset.go3));
    $('#logout').onclick = deconnexion;
    $('#lang').onclick = () => window.I18N.basculer();
  }

  // ---------- TOURNOIS ----------
  function vTournois() {
    if (sousVue) return vTournoi(sousVue);
    const l = C.tournois(S), st = { inscriptions: ['libre', 'Inscriptions'], en_cours: ['occupe', 'En cours'], termine: ['neutre', 'Terminé'] };
    $('#view').innerHTML = `<button class="btn pri wide" id="to-new" style="margin-bottom:14px">+ Créer un tournoi</button>
      <div class="card"><div class="list">${l.map(t => `<button class="li" data-to="${t.id}"><span class="grow"><b>${h(t.nom)}</b><small>${h(t.jeu)} · ${t.date ? jj(new Date(t.date)) : 'date à fixer'} · ${t.joueurs} joueurs</small></span><span class="pill ${st[t.statut][0]}">${st[t.statut][1]}</span></button>`).join('') || '<div class="empty">Aucun tournoi pour le moment</div>'}</div></div>`;
    $('#to-new').onclick = () => modal(`<h2>Nouveau tournoi</h2><div class="sub">Les inscriptions se font ensuite joueur par joueur.</div>
      <div class="field"><label for="tn-n">Nom</label><input id="tn-n" placeholder="Coupe du vendredi"></div>
      <div class="fields2"><div class="field"><label for="tn-j">Jeu</label><input id="tn-j" placeholder="FC 26"></div><div class="field"><label for="tn-d">Date</label><input id="tn-d" type="date" value="${isoJour(new Date())}"></div>
      <div class="field"><label for="tn-i">Inscription (DA)</label><input id="tn-i" inputmode="numeric" value="0"></div><div class="field"><label for="tn-c">Cagnotte (DA)</label><input id="tn-c" inputmode="numeric" value="0"></div></div>
      <div class="actions"><button class="btn" data-fermer>Annuler</button><button class="btn pri" id="tn-ok">Créer</button></div>`, el => {
      el.querySelector('#tn-ok').onclick = async () => { const t = await act(() => C.creerTournoi(S, U, { nom: val('tn-n'), jeu: val('tn-j'), date: val('tn-d'), inscription: val('tn-i'), cagnotte: val('tn-c') }), 'Tournoi créé'); if (t) { fermer(); aller('tournois', t.id); } };
    });
    $$('[data-to]').forEach(b => b.onclick = () => aller('tournois', +b.dataset.to));
  }
  function vTournoi(id) {
    const t = C.tournoi(S, id);
    $('#titre').textContent = t.nom; $('#soustitre').textContent = `${t.jeu} · ${t.date ? jj(new Date(t.date)) : ''}`;
    const tours = [...new Set(t.matchs.map(m => m.tour))], nT = tours.length;
    const nomTour = k => { const r = nT - k; return r === 0 ? 'Finale' : r === 1 ? 'Demi-finales' : r === 2 ? 'Quarts de finale' : `Tour ${k}`; };
    const champion = t.statut === 'termine' ? t.matchs.find(m => m.tour === nT).vainqueur : null;
    $('#view').innerHTML = `<div class="row" style="margin-bottom:12px"><span class="pill neutre">${t.joueurs.length} joueurs</span>${t.inscription ? `<span class="pill neutre">Inscription ${DA(t.inscription)}</span>` : ''}${t.cagnotte ? `<span class="pill neutre">Cagnotte ${DA(t.cagnotte)}</span>` : ''}</div>
      ${champion ? `<div class="card" style="margin-bottom:14px;text-align:center"><span class="lbl">Vainqueur</span><div style="font-size:22px;font-weight:800">${h(champion)}</div></div>` : ''}
      ${t.statut === 'inscriptions' ? `<div class="card"><h2>Inscriptions</h2>
        <div class="row"><input id="tj-n" class="grow" placeholder="Nom du joueur" style="border:1px solid var(--line);background:var(--surface-2);border-radius:10px;padding:10px;min-height:44px"><button class="btn pri" id="tj-ok">Inscrire</button></div>
        ${t.inscription ? `<label class="check" style="margin-top:10px"><input type="checkbox" id="tj-p" checked> A payé ${DA(t.inscription)} (entre en caisse)</label>` : ''}
        <div class="list" style="margin-top:8px">${t.joueurs.map((j, i) => `<div class="li"><span class="grow">${i + 1}. ${h(j.nom)}</span>${t.inscription ? `<span class="pill ${j.paye ? 'libre' : 'pause'}">${j.paye ? 'Payé' : 'Non payé'}</span>` : ''}</div>`).join('') || '<div class="empty">Aucun inscrit</div>'}</div>
        <button class="btn ok wide" id="tj-gen" style="margin-top:12px" ${t.joueurs.length < 2 ? 'disabled' : ''}>Tirer au sort le tableau</button></div>`
      : `<div class="card"><h2>Tableau</h2><div class="bracket">${tours.map(k => `<div class="round"><h3>${nomTour(k)}</h3>${t.matchs.filter(m => m.tour === k).map(m => `<button class="match" data-m="${m.id}" ${m.j1 && m.j2 && !m.vainqueur ? '' : 'disabled'}>
          <div class="${m.vainqueur && m.vainqueur === m.j1 ? 'w' : ''}${m.j1 ? '' : ' tbd'}"><span>${h(m.j1 || (m.tour === 1 ? 'Exempt' : 'À venir'))}</span><b>${m.s1 ?? ''}</b></div>
          <div class="${m.vainqueur && m.vainqueur === m.j2 ? 'w' : ''}${m.j2 ? '' : ' tbd'}"><span>${h(m.j2 || (m.tour === 1 ? 'Exempt' : 'À venir'))}</span><b>${m.s2 ?? ''}</b></div></button>`).join('')}</div>`).join('')}</div>
        <p class="hint">Touchez un match pour saisir le score.</p></div>`}`;
    const ok = $('#tj-ok'); if (ok) {
      const ins = async () => { if (await act(() => C.inscrire(S, U, id, { nom: val('tj-n'), paye: val('tj-p') }), 'Joueur inscrit')) $('#tj-n')?.focus(); };
      ok.onclick = ins; $('#tj-n').onkeydown = e => { if (e.key === 'Enter') ins(); };
      $('#tj-gen').onclick = () => confirmer('Tirer au sort ?', 'Les inscriptions seront fermées et le tableau généré.', 'Tirer au sort', async () => { if (await act(() => C.genererTableau(S, U, id), 'Tableau généré')) fermer(); }, false);
    }
    $$('[data-m]').forEach(b => b.onclick = () => {
      const m = t.matchs.find(x => x.id === +b.dataset.m);
      modal(`<h2>Score</h2><div class="sub">${h(m.j1)} contre ${h(m.j2)}</div>
        <div class="fields2"><div class="field"><label for="sc-1">${h(m.j1)}</label><input id="sc-1" inputmode="numeric" autofocus></div><div class="field"><label for="sc-2">${h(m.j2)}</label><input id="sc-2" inputmode="numeric"></div></div>
        <div class="field"><label for="sc-v">En cas d'égalité, vainqueur aux tirs au but</label><select id="sc-v"><option value="">—</option><option value="${h(m.j1)}" data-notr>${h(m.j1)}</option><option value="${h(m.j2)}" data-notr>${h(m.j2)}</option></select></div>
        <div class="field"><label for="sc-p">Poste (facultatif)</label><input id="sc-p"></div>
        <div class="actions"><button class="btn" data-fermer>Annuler</button><button class="btn pri" id="sc-ok">Valider</button></div>`, el => {
        el.querySelector('#sc-ok').onclick = async () => { if (await act(() => C.score(S, U, m.id, { s1: val('sc-1'), s2: val('sc-2'), vainqueur: val('sc-v'), poste: val('sc-p') }), 'Score enregistré')) fermer(); };
      });
    });
  }

  // ---------- RAPPORTS ----------
  let rDu = null, rAu = null;
  function vRapports() {
    const auj = new Date();
    if (!rAu) { rAu = isoJour(auj); rDu = isoJour(new Date(auj.getFullYear(), auj.getMonth(), auj.getDate() - 6)); }
    const r = C.rapport(S, U, rDu, rAu), T = r.totaux;
    const preset = (du, au, l) => `<button class="btn sm" data-pr="${du}|${au}">${l}</button>`;
    const m0 = new Date(auj.getFullYear(), auj.getMonth(), 1);
    $('#view').innerHTML = `
      <div class="card" style="margin-bottom:14px"><div class="fields2"><div class="field"><label for="r-du">Du</label><input type="date" id="r-du" value="${rDu}"></div><div class="field"><label for="r-au">Au</label><input type="date" id="r-au" value="${rAu}"></div></div>
      <div class="row">${preset(isoJour(auj), isoJour(auj), "Aujourd'hui")}${preset(isoJour(new Date(auj.getFullYear(), auj.getMonth(), auj.getDate() - 6)), isoJour(auj), '7 jours')}${preset(isoJour(m0), isoJour(auj), 'Ce mois')}<span class="grow"></span><button class="btn sm pri" id="r-csv">Exporter (Excel)</button><button class="btn sm" id="r-wa">Résumé WhatsApp</button></div></div>
      <div class="kpis"><div class="kpi"><span>Chiffre d'affaires</span><b>${fmt(T.total)} <small>DA</small></b></div><div class="kpi"><span>dont jeux</span><b>${fmt(T.jeu)} <small>DA</small></b></div>
      <div class="kpi"><span>dont bar</span><b>${fmt(T.bar)} <small>DA</small></b></div><div class="kpi"><span>Cartes, tournois, crédits</span><b>${fmt(T.autres)} <small>DA</small></b></div>
      <div class="kpi"><span>Heures jouées</span><b>${String(T.heures).replace('.', ',')} <small>h</small></b></div><div class="kpi"><span>Occupation</span><b>${T.occupation} <small>%</small></b></div>
      <div class="kpi"><span>Dépenses caisse</span><b>${fmt(T.depenses)} <small>DA</small></b></div><div class="kpi"><span>Écart caisse</span><b class="${T.ecart_caisse ? 'low' : ''}">${fmt(T.ecart_caisse)} <small>DA</small></b></div></div>
      <div class="two"><div class="card chart"><h2>Par jour (DA)</h2>${graphe(r.jours)}</div>
      <div class="card"><h2>Par poste</h2>${r.par_poste.map(p => `<div class="hbar"><span>${h(p.nom)}</span><div class="t"><i style="width:${r.par_poste[0].total ? p.total / r.par_poste[0].total * 100 : 0}%"></i></div><span class="num">${DA(p.total)}</span></div>`).join('') || '<div class="empty">Aucune session</div>'}</div></div>
      <div class="card" style="margin-top:14px"><h2>Par caissier</h2><div class="tbl"><table><thead><tr><th>Caissier</th><th class="r">Sessions</th><th class="r">Jeux</th><th class="r">Bar</th><th class="r">Total</th></tr></thead><tbody>
        ${r.par_caissier.map(c => `<tr><td>${h(c.nom)}</td><td class="r num">${c.sessions}</td><td class="r num">${fmt(c.jeu)}</td><td class="r num">${fmt(c.bar)}</td><td class="r num">${fmt(c.total)}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">—</td></tr>'}</tbody></table></div></div>
      <div class="two" style="margin-top:14px"><div class="card"><h2>Par formule</h2><div class="tbl"><table><thead><tr><th>Formule</th><th class="r">Sessions</th><th class="r">Heures</th><th class="r">CA jeux</th></tr></thead><tbody>
        ${r.par_formule.map(f => `<tr><td>${h(f.nom)}</td><td class="r num">${f.sessions}</td><td class="r num">${String(Math.round(f.minutes / 6) / 10).replace('.', ',')}</td><td class="r num">${fmt(f.total)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">—</td></tr>'}</tbody></table></div></div>
      <div class="card"><h2>Bar : produits</h2><div class="tbl"><table><thead><tr><th>Produit</th><th class="r">Qté</th><th class="r">CA</th><th class="r">Marge</th></tr></thead><tbody>
        ${r.par_produit.map(p => `<tr><td>${h(p.nom)}</td><td class="r num">${p.qte}</td><td class="r num">${fmt(p.ca)}</td><td class="r num">${fmt(p.marge)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">—</td></tr>'}</tbody></table></div></div></div>
      <p class="hint">Période du ${r.du} au ${r.au} · crédits clients en cours : ${DA(T.credit_du)}</p>`;
    const maj = () => { rDu = val('r-du'); rAu = val('r-au'); if (rDu > rAu) [rDu, rAu] = [rAu, rDu]; rendre(); };
    $('#r-du').onchange = maj; $('#r-au').onchange = maj;
    $$('[data-pr]').forEach(b => b.onclick = () => { [rDu, rAu] = b.dataset.pr.split('|'); rendre(); });
    $('#r-csv').onclick = () => partagerFichier(`rapport-salle-${r.du.replace(/\//g, '-')}-au-${r.au.replace(/\//g, '-')}.csv`, C.rapportCSV(S, r), 'text/csv');
    $('#r-wa').onclick = () => {
      const t = `*${S.params.salle_nom}* · du ${r.du} au ${r.au}\nCA : ${DA(T.total)}\n· Jeux : ${DA(T.jeu)}\n· Bar : ${DA(T.bar)}\n· Cartes/tournois/crédits : ${DA(T.autres)}\nSessions : ${T.sessions} · ${String(T.heures).replace('.', ',')} h · occupation ${T.occupation} %\nDépenses : ${DA(T.depenses)} · écart caisse : ${DA(T.ecart_caisse)}`;
      if (navigator.share) navigator.share({ text: t }).catch(() => {}); else location.href = 'https://wa.me/?text=' + encodeURIComponent(t);
    };
  }
  function graphe(d) {
    if (d.length > 31) d = d.slice(-31);
    const W = 520, H = 220, L = 46, B = 26, T = 10, maxV = Math.max(1000, ...d.map(x => x.total));
    const pas = [1000, 2000, 2500, 5000, 10000, 20000, 25000, 50000, 100000, 200000, 500000].find(p => maxV / p <= 5) || 1e6;
    const max = Math.ceil(maxV / pas) * pas, y = v => T + (H - T - B) * (1 - v / max), sx = (W - L - 8) / d.length;
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Chiffre d'affaires par jour">`;
    for (let v = 0; v <= max; v += pas) s += `<line x1="${L}" x2="${W - 4}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${fmt(v)}</text>`;
    const step = Math.ceil(d.length / 8);
    d.forEach((p, i) => {
      const x = L + i * sx + sx * .15, w = sx * .7, last = i === d.length - 1;
      if (p.total) s += `<rect x="${x}" y="${y(p.total)}" width="${w}" height="${y(0) - y(p.total)}" rx="2" fill="${last ? 'var(--accent)' : 'var(--accent-soft)'}" stroke="var(--accent)" stroke-width="${last ? 0 : 1}"><title>${p.jour} : ${DA(p.total)}</title></rect>`;
      if (i % step === 0 || last) s += `<text x="${x + w / 2}" y="${H - 8}" text-anchor="middle">${p.jour.slice(0, 5)}</text>`;
    });
    return s + '</svg>';
  }

  // ---------- JOURNAL ----------
  function vJournal() {
    $('#view').innerHTML = `<div class="card"><div class="list">${S.journal.slice(-200).reverse().map(j => `<div class="li"><span class="grow"><b style="white-space:normal">${h(j.action)}</b><small>${jj(j.date)} ${hm(j.date)} · ${h(j.user)}</small></span></div>`).join('') || '<div class="empty">Journal vide</div>'}</div></div>`;
  }

  // ---------- RÉGLAGES (Admin) ----------
  function vReglages() {
    const P = S.params;
    const postes = S.postes.filter(p => p.actif).sort((a, b) => a.ordre - b.ordre), tarifs = S.tarifs.filter(t => t.actif).sort((a, b) => a.ordre - b.ordre);
    const typeTxt = t => t.type === 'heure' ? `${DA(t.prix)} / heure` : t.type === 'match' ? `${DA(t.prix)} / match de ${t.duree_min} min` : `${DA(t.prix)} pour ${dureeTxt(t.duree_min)}${t.depassement_heure ? `, puis ${DA(t.depassement_heure)}/h` : ''}`;
    $('#view').innerHTML = `
      <div class="card"><h2>Postes (${postes.length}) <button class="btn sm pri act" id="po-new">+ Ajouter</button></h2><div class="list">
        ${postes.map((p, i) => `<div class="li"><span class="grow"><b>${h(p.nom)}</b><small>${h(p.console)} · ${h(p.ecran) || 'écran ?'} · ${p.manettes} manettes</small></span>
        <button class="btn sm" data-mv="postes|${p.id}|-1" ${i ? '' : 'disabled'} aria-label="Monter">↑</button><button class="btn sm" data-mv="postes|${p.id}|1" ${i < postes.length - 1 ? '' : 'disabled'} aria-label="Descendre">↓</button><button class="btn sm" data-po="${p.id}">Modifier</button></div>`).join('') || '<div class="empty">Aucun poste</div>'}</div></div>
      <div class="card" style="margin-top:14px"><h2>Tarifs (${tarifs.length}) <button class="btn sm pri act" id="ta-new">+ Ajouter</button></h2><div class="list">
        ${tarifs.map((t, i) => `<div class="li"><span class="grow"><b>${h(t.libelle)}</b><small>${typeTxt(t)}</small></span>
        <button class="btn sm" data-mv="tarifs|${t.id}|-1" ${i ? '' : 'disabled'} aria-label="Monter">↑</button><button class="btn sm" data-mv="tarifs|${t.id}|1" ${i < tarifs.length - 1 ? '' : 'disabled'} aria-label="Descendre">↓</button><button class="btn sm" data-ta="${t.id}">Modifier</button></div>`).join('')}</div></div>
      <div class="card" style="margin-top:14px"><h2>La salle</h2>
        <div class="field"><label for="pa-nom">Nom de la salle</label><input id="pa-nom" value="${h(P.salle_nom)}" maxlength="40"></div>
        <div class="fields2">
          <div class="field"><label for="pa-fond">Fond de caisse (DA)</label><input id="pa-fond" inputmode="numeric" value="${P.fond_caisse}"></div>
          <div class="field"><label for="pa-arr">Arrondi des prix (DA)</label><input id="pa-arr" inputmode="numeric" value="${P.arrondi}"></div>
          <div class="field"><label for="pa-min">Minimum facturé (min)</label><input id="pa-min" inputmode="numeric" value="${P.minimum_minutes}"></div>
          <div class="field"><label for="pa-ho">Heures d'ouverture / jour</label><input id="pa-ho" inputmode="numeric" value="${P.heures_ouverture}"></div>
          <div class="field"><label for="pa-pts">Points par 100 DA</label><input id="pa-pts" inputmode="numeric" value="${P.points_par_100}"></div>
          <div class="field"><label for="pa-pho">Points pour 1 h offerte</label><input id="pa-pho" inputmode="numeric" value="${P.points_heure_offerte}"></div>
          <div class="field"><label for="pa-rem">Remise max gérant (%)</label><input id="pa-rem" inputmode="numeric" value="${P.remise_max_gerant}"></div>
        </div>
        <label class="check"><input type="checkbox" id="pa-ha" ${P.happy_actif ? 'checked' : ''}> Happy hour (sur les tarifs à l'heure)</label>
        <div class="fields2"><div class="field"><label for="pa-hd">Début</label><input id="pa-hd" type="time" value="${h(P.happy_debut)}"></div><div class="field"><label for="pa-hf">Fin</label><input id="pa-hf" type="time" value="${h(P.happy_fin)}"></div>
        <div class="field"><label for="pa-hp">Réduction (%)</label><input id="pa-hp" inputmode="numeric" value="${P.happy_pct}"></div></div>
        <button class="btn pri wide" id="pa-ok">Enregistrer les réglages</button></div>`;
    $('#po-new').onclick = () => mPoste(); $('#ta-new').onclick = () => mTarif();
    $$('[data-po]').forEach(b => b.onclick = () => mPoste(+b.dataset.po));
    $$('[data-ta]').forEach(b => b.onclick = () => mTarif(+b.dataset.ta));
    $$('[data-mv]').forEach(b => b.onclick = () => { const [t, id, d] = b.dataset.mv.split('|'); act(() => C.deplacer(S, U, t, +id, +d)); });
    $('#pa-ok').onclick = () => act(() => C.enregistrerParams(S, U, { salle_nom: val('pa-nom'), fond_caisse: val('pa-fond'), arrondi: val('pa-arr'), minimum_minutes: val('pa-min'), heures_ouverture: val('pa-ho'),
      points_par_100: val('pa-pts'), points_heure_offerte: val('pa-pho'), remise_max_gerant: val('pa-rem'), happy_actif: val('pa-ha'), happy_debut: val('pa-hd'), happy_fin: val('pa-hf'), happy_pct: val('pa-hp') }), 'Réglages enregistrés');
  }
  function mPoste(id) {
    const p = id ? S.postes.find(x => x.id === id) : { nom: 'P' + (S.postes.filter(x => x.actif).length + 1), console: 'PS5', ecran: '', manettes: 2 };
    modal(`<h2>${id ? 'Modifier le poste' : 'Nouveau poste'}</h2><div class="sub">Le poste apparaît aussitôt sur l'écran Postes.</div>
      <div class="fields2"><div class="field"><label for="pp-n">Nom</label><input id="pp-n" value="${h(p.nom)}" maxlength="20"></div><div class="field"><label for="pp-c">Console</label><input id="pp-c" value="${h(p.console)}" maxlength="20"></div>
      <div class="field"><label for="pp-e">Écran</label><input id="pp-e" value="${h(p.ecran)}" placeholder='55" 4K' maxlength="20"></div><div class="field"><label for="pp-m">Manettes</label><input id="pp-m" inputmode="numeric" value="${p.manettes}"></div></div>
      <div class="actions"><button class="btn" data-fermer>Annuler</button>${id ? '<button class="btn danger" id="pp-del">Supprimer</button>' : ''}<button class="btn pri" id="pp-ok">Enregistrer</button></div>`, el => {
      el.querySelector('#pp-ok').onclick = async () => { if (await act(() => C.enregistrerPoste(S, U, { id, nom: val('pp-n'), console: val('pp-c'), ecran: val('pp-e'), manettes: val('pp-m') }), 'Poste enregistré')) fermer(); };
      const d = el.querySelector('#pp-del'); if (d) d.onclick = () => confirmer(`Supprimer ${p.nom} ?`, "Le poste disparaît de l'écran Postes. Son historique reste dans les rapports.", 'Supprimer', async () => { if (await act(() => C.supprimerPoste(S, U, id), 'Poste supprimé')) fermer(); });
    });
  }
  function mTarif(id) {
    const t = id ? S.tarifs.find(x => x.id === id) : { libelle: '', type: 'heure', prix: '', duree_min: 60, depassement_heure: 0 };
    let type = t.type;
    modal(`<h2>${id ? 'Modifier le tarif' : 'Nouveau tarif'}</h2><div class="sub">Les sessions déjà en cours prennent le nouveau prix.</div>
      <div class="field"><label for="tf-l">Libellé</label><input id="tf-l" value="${h(t.libelle)}" placeholder="1 contre 1" maxlength="60"></div>
      <div class="seg" id="tf-t" style="margin-bottom:12px">${[['heure', "À l'heure"], ['match', 'Par match'], ['forfait', 'Forfait']].map(([k, l]) => `<button data-t="${k}" aria-pressed="${k === type}">${l}</button>`).join('')}</div>
      <div class="fields2"><div class="field"><label for="tf-p" id="tf-pl">Prix (DA)</label><input id="tf-p" inputmode="numeric" value="${t.prix}"></div>
      <div class="field" id="tf-df"><label for="tf-d" id="tf-dl">Durée (min)</label><input id="tf-d" inputmode="numeric" value="${t.duree_min}"></div>
      <div class="field" id="tf-xf"><label for="tf-x">Dépassement (DA / h)</label><input id="tf-x" inputmode="numeric" value="${t.depassement_heure}"></div></div>
      <p class="hint" id="tf-h"></p>
      <div class="actions"><button class="btn" data-fermer>Annuler</button>${id ? '<button class="btn danger" id="tf-del">Supprimer</button>' : ''}<button class="btn pri" id="tf-ok">Enregistrer</button></div>`, el => {
      const maj = () => {
        el.querySelector('#tf-pl').textContent = type === 'heure' ? 'Prix par heure (DA)' : type === 'match' ? 'Prix par match (DA)' : 'Prix du forfait (DA)';
        el.querySelector('#tf-df').hidden = type === 'heure'; el.querySelector('#tf-xf').hidden = type !== 'forfait';
        el.querySelector('#tf-dl').textContent = type === 'match' ? "Durée d'un match (min)" : 'Durée du forfait (min)';
        el.querySelector('#tf-h').textContent = type === 'heure' ? `Facturé à la minute, arrondi à ${S.params.arrondi} DA, minimum ${S.params.minimum_minutes} min.` : type === 'match' ? 'Chaque tranche commencée compte pour un match.' : 'Au-delà de la durée, le dépassement est facturé à la minute.';
      };
      el.querySelectorAll('#tf-t button').forEach(b => b.onclick = () => { type = b.dataset.t; el.querySelectorAll('#tf-t button').forEach(x => x.setAttribute('aria-pressed', x === b)); maj(); });
      maj();
      el.querySelector('#tf-ok').onclick = async () => { if (await act(() => C.enregistrerTarif(S, U, { id, libelle: val('tf-l'), type, prix: val('tf-p'), duree_min: val('tf-d'), depassement_heure: val('tf-x') }), 'Tarif enregistré')) fermer(); };
      const d = el.querySelector('#tf-del'); if (d) d.onclick = () => confirmer('Supprimer ce tarif ?', `${t.libelle} ne sera plus proposé. L'historique est conservé.`, 'Supprimer', async () => { if (await act(() => C.supprimerTarif(S, U, id), 'Tarif supprimé')) fermer(); });
    });
  }

  // ---------- UTILISATEURS ----------
  function vUsers() {
    const l = S.users.filter(u => u.actif);
    $('#view').innerHTML = `<button class="btn pri wide" id="us-new" style="margin-bottom:14px">+ Ajouter un utilisateur</button>
      <div class="card"><div class="list">${l.map(u => `<button class="li" data-us="${u.id}"><span class="av">${h(initiales(u.nom))}</span><span class="grow"><b>${h(u.nom)}</b><small>${h(u.role)}</small></span><span class="end muted">Modifier</span></button>`).join('')}</div></div>
      <div class="card" style="margin-top:14px"><h2>Droits par rôle</h2><div class="tbl"><table><thead><tr><th>Fonction</th><th>Admin</th><th>Gérant</th><th>Caissier</th></tr></thead><tbody>
      ${[['Postes, bar, caisse, clients', 'postes'], ['Remises et annulations', 'remise'], ['Stock et produits', 'stock'], ['Tournois', 'tournois'], ['Rapports et journal', 'rapports'], ['Réglages, tarifs, postes', 'params'], ['Utilisateurs', 'users']]
        .map(([l, d]) => `<tr><td>${l}</td>${C.ROLES.map(r => `<td>${C.DROITS[r].includes(d) ? '<span class="pos">Oui</span>' : '<span class="muted">Non</span>'}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
    $('#us-new').onclick = () => mUser();
    $$('[data-us]').forEach(b => b.onclick = () => mUser(+b.dataset.us));
  }
  function mUser(id) {
    const u = id ? S.users.find(x => x.id === id) : { nom: '', role: 'Caissier' };
    modal(`<h2>${id ? 'Modifier ' + h(u.nom) : 'Nouvel utilisateur'}</h2><div class="sub">Chaque personne se connecte avec son propre code PIN.</div>
      <div class="field"><label for="us-n">Nom</label><input id="us-n" value="${h(u.nom)}" maxlength="40"></div>
      <div class="field"><label for="us-r">Rôle</label><select id="us-r">${C.ROLES.map(r => `<option value="${r}" ${r === u.role ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
      <div class="field"><label for="us-p">${id ? 'Nouveau code PIN (laisser vide pour ne pas changer)' : 'Code PIN (4 à 6 chiffres)'}</label><input id="us-p" inputmode="numeric" maxlength="6" autocomplete="off"></div>
      <div class="actions"><button class="btn" data-fermer>Annuler</button>${id && id !== U.id ? '<button class="btn danger" id="us-del">Supprimer</button>' : ''}<button class="btn pri" id="us-ok">Enregistrer</button></div>`, el => {
      el.querySelector('#us-ok').onclick = async () => { if (await act(() => C.enregistrerUser(S, U, { id, nom: val('us-n'), role: val('us-r'), pin: val('us-p') }), 'Utilisateur enregistré')) fermer(); };
      const d = el.querySelector('#us-del'); if (d) d.onclick = () => confirmer(`Supprimer ${u.nom} ?`, 'Il ne pourra plus se connecter. Son historique est conservé.', 'Supprimer', async () => { if (await act(() => C.supprimerUser(S, U, id), 'Utilisateur supprimé')) fermer(); });
    });
  }

  // ---------- SAUVEGARDE ----------
  function vSauvegarde() {
    const taille = new Blob([Store.exporter(S)]).size;
    $('#view').innerHTML = `<div class="card"><h2>Sauvegarder</h2>
      <p class="hint" style="margin:0 0 12px">Les données sont enregistrées dans ce téléphone. Faites une sauvegarde chaque semaine et gardez le fichier dans « Fichiers », sur WhatsApp ou par e-mail : si le téléphone est perdu ou réinitialisé, c'est votre seule copie.</p>
      <div class="list" style="margin-bottom:12px"><div class="li"><span class="grow">Dernière sauvegarde</span><span class="end">${S.derniere_sauvegarde ? `${jj(S.derniere_sauvegarde)} ${hm(S.derniere_sauvegarde)}` : 'jamais'}</span></div>
      <div class="li"><span class="grow">Taille des données</span><span class="end">${(taille / 1024).toFixed(0)} Ko</span></div>
      <div class="li"><span class="grow">Sessions enregistrées</span><span class="end">${S.sessions.length}</span></div></div>
      <button class="btn pri wide" id="sv-exp">Créer une sauvegarde</button></div>
      <div class="card" style="margin-top:14px"><h2>Restaurer</h2><p class="hint" style="margin:0 0 12px">Remplace toutes les données de ce téléphone par celles du fichier choisi. Sert aussi à passer sur un nouveau téléphone.</p>
      <input type="file" id="sv-file" accept=".json,application/json" hidden><button class="btn danger wide" id="sv-imp">Choisir un fichier de sauvegarde</button></div>`;
    $('#sv-exp').onclick = async () => {
      const d = new Date(), nom = `sauvegarde-salle-${isoJour(d)}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}.json`;
      if (await partagerFichier(nom, Store.exporter(S), 'application/json')) { S.derniere_sauvegarde = Date.now(); await Store.enregistrer(S); toast('Sauvegarde créée'); rendre(); }
    };
    $('#sv-imp').onclick = () => $('#sv-file').click();
    $('#sv-file').onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const n = Store.importer(await f.text());
        confirmer('Restaurer cette sauvegarde ?', `Toutes les données actuelles seront remplacées (${n.sessions.length} sessions, ${n.clients.length} clients dans le fichier).`, 'Restaurer', async () => {
          S = await C.initialiser(n); await Store.enregistrer(S); fermer(); toast('Données restaurées'); deconnexion();
        });
      } catch (err) { toast(err.message, true); }
      e.target.value = '';
    };
  }

  // ---------- CODE PIN ----------
  function vPin() {
    $('#view').innerHTML = `<div class="card"><div class="field"><label for="np-1">Nouveau code (4 à 6 chiffres)</label><input id="np-1" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password"></div>
      <div class="field"><label for="np-2">Confirmer</label><input id="np-2" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password"></div>
      <button class="btn pri wide" id="np-ok">Changer mon code</button></div>`;
    $('#np-ok').onclick = async () => {
      if (val('np-1') !== val('np-2')) return toast('Les deux codes ne sont pas identiques.', true);
      if (await act(() => C.changerPin(S, U, val('np-1')), 'Code PIN changé')) { U.pin_defaut = false; aller('postes'); }
    };
  }

  // ---------- CONNEXION ----------
  let choisi = null, code = '';
  function ecranConnexion() {
    U = null; fermer();
    const l = S.users.filter(u => u.actif);
    if (!choisi || !l.some(u => u.id === choisi)) choisi = l[0].id;
    $('#login-salle').textContent = S.params.salle_nom;
    $('#login-users').innerHTML = l.map(u => `<button data-u="${u.id}" aria-pressed="${u.id === choisi}"><span class="av">${h(initiales(u.nom))}</span><span><b>${h(u.nom)}</b><small>${h(u.role)}</small></span></button>`).join('');
    $$('#login-users button').forEach(b => b.onclick = () => { choisi = +b.dataset.u; code = ''; $('#login-err').textContent = ''; ecranConnexion(); });
    $$('#pin i').forEach((d, i) => { d.classList.toggle('f', i < code.length); d.classList.toggle('opt4', i >= 4 && i >= code.length); });
    $('#login').hidden = false;
  }
  $('#login-lang').onclick = () => window.I18N.basculer();
  $('#pad').innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9, '⌫', 0, 'OK'].map(k => `<button data-k="${k}" ${k === 'OK' ? 'class="ok"' : ''} aria-label="${k === '⌫' ? 'Effacer' : k}">${k}</button>`).join('');
  async function valider() {
    if (code.length < 4) return;
    try {
      U = await C.connexion(S, choisi, code); code = '';
      await Store.enregistrer(S);
      try { localStorage.setItem(LS_USER, String(U.id)); } catch {}
      $('#login').hidden = true; $('#login-err').textContent = ''; aller('postes');
    } catch (e) { code = ''; $('#login-err').textContent = e.message; ecranConnexion(); }
  }
  $('#pad').addEventListener('click', e => {
    const k = e.target.closest('[data-k]')?.dataset.k; if (k === undefined) return;
    if (k === '⌫') code = code.slice(0, -1); else if (k === 'OK') return valider(); else if (code.length < 6) code += k;
    $('#login-err').textContent = ''; ecranConnexion();
  });
  document.addEventListener('keydown', e => {
    if ($('#login').hidden) { if (e.key === 'Escape' && !$('#modal').hidden) fermer(); return; }
    if (/^\d$/.test(e.key) && code.length < 6) { code += e.key; ecranConnexion(); }
    else if (e.key === 'Backspace') { code = code.slice(0, -1); ecranConnexion(); }
    else if (e.key === 'Enter') valider();
  });
  function deconnexion() { try { localStorage.removeItem(LS_USER); } catch {} choisi = U?.id || choisi; code = ''; ecranConnexion(); }

  // ---------- Minuteurs ----------
  setInterval(() => {
    if (!U) return;
    const now = Date.now();
    for (const s of S.sessions) {
      if (s.statut !== 'en_cours') continue;
      const el = document.querySelector(`[data-timer="${s.id}"]`);
      if (el) el.textContent = chrono(now - s.debut - s.pause_total);
      const t = S.tarifs.find(x => x.id === s.tarif_id);
      if (t?.type === 'forfait' && !alertes.has(s.id) && (now - s.debut - s.pause_total) / 60000 > t.duree_min) {
        alertes.add(s.id); bip(); toast(`${S.postes.find(p => p.id === s.poste_id)?.nom} : forfait terminé`, true);
        if (vue === 'postes' && $('#modal').hidden) rendre();
      }
    }
  }, 1000);
  setInterval(() => { if (U && vue === 'postes' && $('#modal').hidden) rendre(); }, 20000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && U && $('#modal').hidden) rendre(); });

  // ---------- Démarrage ----------
  (async function start() {
    S = await Store.charger() || C.etatVide();
    await C.initialiser(S); await Store.enregistrer(S);
    // les forfaits déjà dépassés au lancement ne sonnent pas
    const now = Date.now();
    S.sessions.filter(s => s.statut === 'en_cours').forEach(s => { const t = S.tarifs.find(x => x.id === s.tarif_id); if (t?.type === 'forfait' && (now - s.debut - s.pause_total) / 60000 > t.duree_min) alertes.add(s.id); });
    let uid = null; try { uid = Number(localStorage.getItem(LS_USER)); } catch {}
    const u = uid && S.users.find(x => x.id === uid && x.actif);
    if (u) { U = { id: u.id, nom: u.nom, role: u.role, droits: C.DROITS[u.role], pin_defaut: false }; aller('postes'); }
    else ecranConnexion();
  })();
})();
