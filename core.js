/* Moteur de gestion de la salle PS5.
   Toute la logique métier est ici, sans interface : la même fonction sert sur iPhone (données locales)
   et servira plus tard au serveur PC / Android. Les dates sont en millisecondes. */
(function (root) {
  'use strict';

  const ROLES = ['Admin', 'Gérant', 'Caissier'];
  const DROITS = {
    Admin: ['postes', 'bar', 'caisse', 'clients', 'tournois', 'rapports', 'journal', 'remise', 'annuler', 'stock', 'users', 'params'],
    'Gérant': ['postes', 'bar', 'caisse', 'clients', 'tournois', 'rapports', 'journal', 'remise', 'annuler', 'stock'],
    Caissier: ['postes', 'bar', 'caisse', 'clients']
  };
  const PARAMS_DEFAUT = {
    salle_nom: 'GAME ROOM', fond_caisse: 5000, arrondi: 10, minimum_minutes: 15,
    happy_actif: false, happy_debut: '14:00', happy_fin: '17:00', happy_pct: 20,
    points_par_100: 1, points_heure_offerte: 100, heures_ouverture: 14, remise_max_gerant: 20
  };

  class ErreurMetier extends Error { constructor(msg, code = 400) { super(msg); this.code = code; } }
  const fail = (msg, code) => { throw new ErreurMetier(msg, code); };
  const int = (v, def = 0) => { const n = Math.round(Number(String(v ?? '').replace(/\s/g, '').replace(',', '.'))); return Number.isFinite(n) ? n : def; };
  const txt = (v, max = 120) => String(v ?? '').trim().slice(0, max);
  const fmt = n => Math.round(n || 0).toLocaleString('fr-FR').replace(/ | /g, ' ');
  const jj = ts => { const d = new Date(ts); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; };

  // ---------- Code PIN (PBKDF2, asynchrone) ----------
  const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  async function hashPin(pin, sel) {
    sel = sel || hex(crypto.getRandomValues(new Uint8Array(16)));
    const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(pin)), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(sel), iterations: 60000, hash: 'SHA-256' }, k, 256);
    return sel + ':' + hex(bits);
  }
  async function verifPin(pin, stocke) { const [sel] = String(stocke).split(':'); return (await hashPin(pin, sel)) === stocke; }

  // ---------- État initial ----------
  function etatVide() {
    return {
      version: 1, cree_le: Date.now(), seq: {}, params: { ...PARAMS_DEFAUT },
      users: [], postes: [], tarifs: [], clients: [], sessions: [], produits: [], ventes_bar: [], mvt_stock: [],
      journees: [], mouvements: [], tournois: [], tjoueurs: [], tmatchs: [], journal: []
    };
  }
  async function initialiser(S) {
    S.params = { ...PARAMS_DEFAUT, ...(S.params || {}) };
    for (const k of Object.keys(etatVide())) if (S[k] === undefined) S[k] = etatVide()[k];
    if (!S.users.length) S.users.push({ id: nid(S, 'users'), nom: 'Admin', role: 'Admin', pin: await hashPin('1234'), actif: true, cree_le: Date.now() });
    if (!S.postes.length) [['P1', '55" 4K', 2], ['P2', '55" 4K', 2], ['P3', '50"', 2], ['P4', '50"', 4], ['P5 VIP', '65"', 2], ['P6', '50"', 2]]
      .forEach((r, i) => S.postes.push({ id: nid(S, 'postes'), nom: r[0], console: 'PS5', ecran: r[1], manettes: r[2], ordre: i, actif: true }));
    if (!S.tarifs.length) [['1 contre 1 (2 manettes)', 'heure', 250, 0, 0], ['2 contre 2 (4 manettes)', 'heure', 400, 0, 0], ['Match FC', 'match', 100, 12, 0], ['Forfait 3 heures', 'forfait', 600, 180, 250]]
      .forEach((r, i) => S.tarifs.push({ id: nid(S, 'tarifs'), libelle: r[0], type: r[1], prix: r[2], duree_min: r[3], depassement_heure: r[4], ordre: i, actif: true }));
    if (!S.produits.length) [['Coca 33 cl', 100, 70, 24, 12], ['Hamoud 1 L', 120, 85, 12, 6], ['Eau 0,5 L', 40, 25, 24, 12], ['Red Bull', 250, 190, 12, 6], ['Chips', 60, 40, 20, 10], ['Café', 50, 15, 0, 0], ['Gaufrette', 40, 25, 20, 10], ['Jus 25 cl', 70, 48, 24, 12]]
      .forEach(r => S.produits.push({ id: nid(S, 'produits'), nom: r[0], prix_vente: r[1], prix_achat: r[2], stock: r[3], seuil: r[4], actif: true }));
    return S;
  }
  function nid(S, t) { S.seq[t] = Math.max(S.seq[t] || 0, ...S[t].map(r => r.id || 0)) + 1; return S.seq[t]; }
  const get = (S, t, id) => S[t].find(r => r.id === Number(id));
  const log = (S, u, action) => { S.journal.push({ id: nid(S, 'journal'), date: Date.now(), user_id: u.id, user: u.nom, action }); if (S.journal.length > 5000) S.journal.splice(0, S.journal.length - 5000); };
  const peut = (u, d) => { if (!u || !DROITS[u.role]?.includes(d)) fail("Votre rôle n'a pas accès à cette fonction.", 403); };

  // ---------- Connexion ----------
  async function connexion(S, userId, pin) {
    const u = S.users.find(x => x.id === Number(userId) && x.actif);
    if (!u) fail('Utilisateur introuvable.');
    const k = '_essais_' + u.id; S._mem = S._mem || {};
    const e = S._mem[k] || { n: 0, t: 0 };
    if (e.n >= 5 && Date.now() - e.t < 60000) fail("Trop d'essais. Réessayez dans une minute.", 429);
    if (!(await verifPin(pin, u.pin))) { S._mem[k] = { n: e.n + 1, t: Date.now() }; fail('Code PIN incorrect.', 401); }
    delete S._mem[k];
    log(S, u, 'Connexion');
    return { id: u.id, nom: u.nom, role: u.role, droits: DROITS[u.role], pin_defaut: await verifPin('1234', u.pin) };
  }
  async function changerPin(S, u, pin) {
    if (!/^\d{4,6}$/.test(String(pin))) fail('Le code doit faire 4 à 6 chiffres.');
    get(S, 'users', u.id).pin = await hashPin(pin);
    log(S, u, 'A changé son code PIN');
  }

  // ---------- Prix ----------
  function minutesJouees(s, now = Date.now()) {
    const fin = s.fin || (s.statut === 'pause' && s.pause_debut ? s.pause_debut : now);
    return Math.max(0, (fin - s.debut - (s.pause_total || 0)) / 60000);
  }
  function dansHappyHour(ts, P) {
    if (!P.happy_actif) return false;
    const d = new Date(ts), m = d.getHours() * 60 + d.getMinutes();
    const toMin = s => { const [h, mm] = String(s).split(':').map(Number); return h * 60 + (mm || 0); };
    const a = toMin(P.happy_debut), b = toMin(P.happy_fin);
    return a <= b ? m >= a && m < b : m >= a || m < b;
  }
  function prixJeu(s, t, P, now = Date.now()) {
    const arr = Math.max(1, int(P.arrondi, 10));
    const up = x => Math.ceil(x / arr - 1e-9) * arr;
    const min = minutesJouees(s, now);
    let jeu = 0, limite = 0;
    if (t.type === 'heure') jeu = up(Math.max(min, int(P.minimum_minutes)) * t.prix / 60);
    else if (t.type === 'match') { limite = Math.max(1, t.duree_min); jeu = Math.max(1, Math.ceil(min / limite - 1e-9)) * t.prix; }
    else { limite = t.duree_min; jeu = t.prix; if (min > limite && t.depassement_heure) jeu += up((min - limite) * t.depassement_heure / 60); }
    const happy = t.type === 'heure' && dansHappyHour(s.debut, P);
    if (happy) jeu = up(jeu * (1 - int(P.happy_pct) / 100));
    return { minutes: Math.floor(min), jeu, limite_min: limite, depasse: t.type === 'forfait' && min > limite, happy };
  }

  // ---------- Sessions ----------
  const actives = S => S.sessions.filter(s => s.statut === 'en_cours' || s.statut === 'pause');
  function calc(S, s, now) {
    const t = get(S, 'tarifs', s.tarif_id), p = prixJeu(s, t, S.params, now);
    const lignes = S.ventes_bar.filter(v => v.session_id === s.id);
    const bar = lignes.reduce((a, v) => a + v.qte * v.prix, 0);
    return { ...s, tarif: t, ...p, bar, lignes, total: p.jeu + bar, client: s.client_id ? get(S, 'clients', s.client_id) : null, poste: get(S, 'postes', s.poste_id) };
  }
  function getActive(S, id) { const s = actives(S).find(x => x.id === Number(id)); if (!s) fail('Cette session est déjà terminée.', 404); return s; }
  const libre = (S, pid) => !actives(S).some(s => s.poste_id === pid);

  function etat(S) {
    const now = Date.now();
    const postes = S.postes.filter(p => p.actif).sort((a, b) => a.ordre - b.ordre || a.id - b.id).map(p => {
      const s = actives(S).find(a => a.poste_id === p.id);
      return { ...p, session: s ? calc(S, s, now) : null };
    });
    const d0 = new Date(); d0.setHours(0, 0, 0, 0);
    const j = journeeOuverte(S);
    return {
      now, postes, tarifs: S.tarifs.filter(t => t.actif).sort((a, b) => a.ordre - b.ordre),
      caisse: j ? { ...j, solde: soldeTheorique(S, j) } : null,
      encaisse_jour: S.mouvements.filter(m => m.date >= +d0 && m.montant > 0 && m.mode === 'Espèces' && m.categorie !== 'entree').reduce((a, m) => a + m.montant, 0),
      en_cours: postes.reduce((a, p) => a + (p.session ? p.session.total : 0), 0),
      alertes_stock: S.produits.filter(p => p.actif && p.seuil > 0 && p.stock <= p.seuil).length
    };
  }

  function demarrer(S, u, { poste_id, tarif_id, client_id, joueur }) {
    peut(u, 'postes');
    const p = get(S, 'postes', poste_id); if (!p || !p.actif) fail('Poste introuvable.', 404);
    if (!libre(S, p.id)) fail(`${p.nom} est déjà occupé.`, 409);
    const t = get(S, 'tarifs', tarif_id); if (!t || !t.actif) fail('Choisissez une formule.');
    const c = client_id ? get(S, 'clients', client_id) : null; if (client_id && !c) fail('Client introuvable.', 404);
    const s = { id: nid(S, 'sessions'), poste_id: p.id, tarif_id: t.id, client_id: c?.id || null, joueur: txt(joueur, 60), debut: Date.now(), fin: null, pause_debut: null, pause_total: 0, statut: 'en_cours', user_ouverture: u.id };
    S.sessions.push(s);
    if (c) c.derniere_visite = Date.now();
    log(S, u, `A démarré ${p.nom} · ${t.libelle}`);
    return s;
  }
  function pause(S, u, id) {
    peut(u, 'postes'); const s = getActive(S, id), p = get(S, 'postes', s.poste_id);
    if (s.statut === 'pause') { s.pause_total += Date.now() - s.pause_debut; s.pause_debut = null; s.statut = 'en_cours'; log(S, u, `A repris ${p.nom}`); }
    else { s.pause_debut = Date.now(); s.statut = 'pause'; log(S, u, `A mis ${p.nom} en pause`); }
  }
  function changerPoste(S, u, id, poste_id) {
    peut(u, 'postes'); const s = getActive(S, id), a = get(S, 'postes', s.poste_id), b = get(S, 'postes', poste_id);
    if (!b || !b.actif) fail('Poste introuvable.', 404); if (!libre(S, b.id)) fail(`${b.nom} est occupé.`, 409);
    s.poste_id = b.id; log(S, u, `A déplacé la session de ${a.nom} vers ${b.nom}`);
  }
  function changerFormule(S, u, id, tarif_id) {
    peut(u, 'postes'); const s = getActive(S, id), t = get(S, 'tarifs', tarif_id); if (!t || !t.actif) fail('Formule introuvable.');
    s.tarif_id = t.id; log(S, u, `A changé la formule de ${get(S, 'postes', s.poste_id).nom} : ${t.libelle}`);
  }
  function associerClient(S, u, id, client_id) {
    peut(u, 'postes'); const s = getActive(S, id), c = client_id ? get(S, 'clients', client_id) : null;
    s.client_id = c?.id || null; if (c) c.derniere_visite = Date.now();
  }
  function annuler(S, u, id, motif) {
    peut(u, 'annuler'); const s = getActive(S, id); motif = txt(motif) || fail("Indiquez le motif de l'annulation.");
    for (const v of S.ventes_bar.filter(v => v.session_id === s.id)) { const p = get(S, 'produits', v.produit_id); if (p) p.stock += v.qte; }
    S.ventes_bar = S.ventes_bar.filter(v => v.session_id !== s.id);
    Object.assign(s, { statut: 'annulee', fin: Date.now(), user_cloture: u.id, motif });
    log(S, u, `A annulé la session de ${get(S, 'postes', s.poste_id).nom} (motif : ${motif})`);
  }
  function apercu(S, id, extra = {}) { return calc(S, { ...getActive(S, id), ...extra }, Date.now()); }

  function encaisser(S, u, id, { mode = 'Espèces', remise = 0 } = {}) {
    peut(u, 'postes');
    const j = exigeCaisse(S), s0 = getActive(S, id), now = Date.now();
    if (!['Espèces', 'Heures prépayées', 'Crédit'].includes(mode)) fail('Mode de paiement inconnu.');
    const tmp = { ...s0 };
    if (tmp.statut === 'pause') { tmp.pause_total += now - tmp.pause_debut; tmp.pause_debut = null; tmp.statut = 'en_cours'; }
    tmp.fin = now;
    const s = calc(S, tmp, now);
    remise = Math.max(0, int(remise));
    if (remise && !DROITS[u.role].includes('remise')) fail("Seuls le gérant et l'admin peuvent faire une remise.", 403);
    if (u.role === 'Gérant' && remise > s.total * int(S.params.remise_max_gerant) / 100) fail(`Remise limitée à ${S.params.remise_max_gerant} % pour le gérant.`, 403);
    remise = Math.min(remise, s.total);
    const cl = s.client;
    let jeuPaye = s.jeu, minCarte = 0;
    if (mode === 'Heures prépayées') {
      if (!cl) fail('Associez un client fidèle pour utiliser ses heures.');
      minCarte = Math.max(1, s.minutes);
      if (cl.minutes_prepayees < minCarte) fail(`Solde insuffisant : ${cl.minutes_prepayees} min sur la carte, ${minCarte} min jouées.`);
      jeuPaye = 0;
    }
    if (mode === 'Crédit' && !cl) fail('Associez un client fidèle pour mettre en crédit.');
    const total = Math.max(0, jeuPaye + s.bar - remise);
    const lib = `${s.poste.nom} · ${s.tarif.libelle} · ${s.minutes} min`;
    Object.assign(s0, { statut: 'terminee', fin: now, pause_total: tmp.pause_total, pause_debut: null, minutes: s.minutes,
      montant_jeu: mode === 'Heures prépayées' ? 0 : s.jeu, montant_bar: s.bar, remise, total, mode_paiement: mode, minutes_carte: minCarte, user_cloture: u.id });
    S.ventes_bar.filter(v => v.session_id === s0.id).forEach(v => v.paye = true);
    if (mode === 'Crédit') { cl.credit += total; mouvement(S, j, u, lib + ' (à crédit)', 'jeu', 'Crédit', total, { session_id: s0.id, client_id: cl.id }); }
    else {
      if (minCarte) cl.minutes_prepayees -= minCarte;
      if (total || !minCarte) mouvement(S, j, u, lib + (minCarte ? ` (jeu sur carte, ${minCarte} min)` : ''), 'jeu', 'Espèces', total, { session_id: s0.id, client_id: cl?.id });
      if (cl && total) cl.points += Math.floor(total / 100) * int(S.params.points_par_100, 1);
    }
    log(S, u, `A encaissé ${s.poste.nom} · ${fmt(total)} DA (${mode}${remise ? `, remise ${fmt(remise)} DA` : ''})`);
    return { total, minutes: s.minutes, jeu: s.jeu, bar: s.bar, remise, mode };
  }

  // ---------- Bar et stock ----------
  function venteBar(S, u, { session_id, items }) {
    peut(u, 'bar');
    if (!items?.length) fail('Le panier est vide.');
    const sess = session_id ? getActive(S, session_id) : null;
    const j = sess ? null : exigeCaisse(S);
    let total = 0; const noms = [];
    const lignes = items.map(it => { const p = get(S, 'produits', it.produit_id); if (!p || !p.actif) fail('Produit introuvable.', 404); return { p, q: Math.max(1, int(it.qte, 1)) }; });
    for (const { p, q } of lignes) {
      S.ventes_bar.push({ id: nid(S, 'ventes_bar'), session_id: sess?.id || null, produit_id: p.id, produit: p.nom, qte: q, prix: p.prix_vente, prix_achat: p.prix_achat, date: Date.now(), user_id: u.id, paye: !sess });
      p.stock -= q; total += q * p.prix_vente; noms.push(`${q} × ${p.nom}`);
    }
    if (!sess) mouvement(S, j, u, 'Bar comptoir · ' + noms.join(', '), 'bar', 'Espèces', total);
    log(S, u, sess ? `A ajouté ${fmt(total)} DA de bar sur ${get(S, 'postes', sess.poste_id).nom}` : `Vente bar comptoir ${fmt(total)} DA`);
    return { total };
  }
  function retirerLigneBar(S, u, ligne_id) {
    peut(u, 'bar'); const v = S.ventes_bar.find(x => x.id === Number(ligne_id));
    if (!v || v.paye) fail('Cette ligne est déjà payée.'); const p = get(S, 'produits', v.produit_id); if (p) p.stock += v.qte;
    S.ventes_bar = S.ventes_bar.filter(x => x !== v); log(S, u, `A retiré ${v.qte} × ${v.produit} d'une note`);
  }
  function enregistrerProduit(S, u, b) {
    peut(u, 'stock'); const nom = txt(b.nom, 40) || fail('Nom obligatoire.');
    if (int(b.prix_vente) <= 0) fail('Prix de vente invalide.');
    if (b.id) { Object.assign(get(S, 'produits', b.id), { nom, prix_vente: int(b.prix_vente), prix_achat: int(b.prix_achat), seuil: int(b.seuil) }); log(S, u, `A modifié le produit ${nom}`); }
    else { S.produits.push({ id: nid(S, 'produits'), nom, prix_vente: int(b.prix_vente), prix_achat: int(b.prix_achat), stock: int(b.stock), seuil: int(b.seuil), actif: true }); log(S, u, `A créé le produit ${nom}`); }
  }
  function supprimerProduit(S, u, id) { peut(u, 'stock'); const p = get(S, 'produits', id); p.actif = false; log(S, u, `A supprimé le produit ${p.nom}`); }
  function mouvementStock(S, u, id, { qte, prix_achat, motif }) {
    peut(u, 'stock'); const p = get(S, 'produits', id) || fail('Produit introuvable.', 404);
    const q = int(qte); if (!q) fail('Quantité obligatoire.');
    motif = txt(motif, 60) || (q > 0 ? 'Réception' : 'Correction');
    p.stock += q; if (int(prix_achat) > 0) p.prix_achat = int(prix_achat);
    S.mvt_stock.push({ id: nid(S, 'mvt_stock'), produit_id: p.id, produit: p.nom, qte: q, motif, date: Date.now(), user_id: u.id });
    log(S, u, `Stock ${p.nom} : ${q > 0 ? '+' : ''}${q} (${motif})`);
  }

  // ---------- Caisse ----------
  const journeeOuverte = S => S.journees.find(j => !j.cloture);
  function exigeCaisse(S) { const j = journeeOuverte(S); if (!j) fail("La caisse est fermée. Ouvrez la caisse avant d'encaisser.", 409); return j; }
  function mouvement(S, j, u, libelle, categorie, mode, montant, x = {}) {
    S.mouvements.push({ id: nid(S, 'mouvements'), journee_id: j.id, date: Date.now(), libelle, categorie, mode, montant, user_id: u.id, user: u.nom, session_id: x.session_id || null, client_id: x.client_id || null });
  }
  const soldeTheorique = (S, j) => j.fond + S.mouvements.filter(m => m.journee_id === j.id && m.mode === 'Espèces').reduce((a, m) => a + m.montant, 0);
  function caisse(S) {
    const j = journeeOuverte(S) || S.journees[S.journees.length - 1];
    if (!j) return { journee: null, mouvements: [], fond_defaut: int(S.params.fond_caisse) };
    const mv = S.mouvements.filter(m => m.journee_id === j.id).slice().reverse();
    const sum = f => mv.filter(f).reduce((a, m) => a + m.montant, 0);
    return { journee: { ...j, user_ouverture_nom: get(S, 'users', j.user_ouverture)?.nom }, mouvements: mv, fond_defaut: int(S.params.fond_caisse),
      entrees: sum(m => m.mode === 'Espèces' && m.montant > 0), sorties: -sum(m => m.montant < 0), credit: sum(m => m.mode === 'Crédit'), solde: soldeTheorique(S, j) };
  }
  function ouvrirCaisse(S, u, fond) {
    peut(u, 'caisse'); if (journeeOuverte(S)) fail('La caisse est déjà ouverte.', 409);
    fond = fond === '' || fond == null ? int(S.params.fond_caisse) : int(fond);
    S.journees.push({ id: nid(S, 'journees'), ouverture: Date.now(), user_ouverture: u.id, fond, cloture: null });
    log(S, u, `Ouverture de caisse · fond ${fmt(fond)} DA`);
  }
  function mouvementCaisse(S, u, { type, montant, libelle }) {
    peut(u, 'caisse'); const j = exigeCaisse(S), m = int(montant); if (m <= 0) fail('Montant invalide.');
    libelle = txt(libelle, 80) || fail('Libellé obligatoire.'); const sortie = type === 'sortie';
    if (sortie && m > soldeTheorique(S, j)) fail('La sortie dépasse les espèces en caisse.');
    mouvement(S, j, u, libelle, sortie ? 'depense' : 'entree', 'Espèces', sortie ? -m : m);
    log(S, u, `${sortie ? 'Sortie' : 'Entrée'} de caisse ${fmt(m)} DA · ${libelle}`);
  }
  function cloturerCaisse(S, u, especes) {
    peut(u, 'caisse'); const j = exigeCaisse(S);
    if (actives(S).length) fail('Des postes sont encore occupés. Encaissez-les avant de clôturer.', 409);
    if (especes === '' || especes == null) fail('Saisissez les espèces comptées.');
    const c = int(especes), th = soldeTheorique(S, j);
    Object.assign(j, { cloture: Date.now(), user_cloture: u.id, especes_comptees: c, theorique: th, ecart: c - th });
    log(S, u, `Clôture de caisse · attendu ${fmt(th)} DA, compté ${fmt(c)} DA, écart ${fmt(c - th)} DA`);
    return { theorique: th, comptees: c, ecart: c - th };
  }

  // ---------- Clients ----------
  function clients(S, q = '') {
    q = txt(q, 60).toLowerCase();
    return S.clients.filter(c => c.actif && (!q || [c.nom, c.tel, c.carte].some(v => String(v).toLowerCase().includes(q))))
      .sort((a, b) => (b.derniere_visite || 0) - (a.derniere_visite || 0) || a.nom.localeCompare(b.nom));
  }
  function enregistrerClient(S, u, b) {
    peut(u, 'clients'); const nom = txt(b.nom, 60) || fail('Nom obligatoire.');
    if (b.id) { Object.assign(get(S, 'clients', b.id), { nom, tel: txt(b.tel, 20) }); log(S, u, `A modifié le client ${nom}`); return get(S, 'clients', b.id); }
    const id = nid(S, 'clients'), c = { id, carte: 'C-' + String(id).padStart(4, '0'), nom, tel: txt(b.tel, 20), minutes_prepayees: 0, points: 0, credit: 0, derniere_visite: null, cree_le: Date.now(), actif: true };
    S.clients.push(c); log(S, u, `A créé le client ${nom} (${c.carte})`); return c;
  }
  function rechargerClient(S, u, id, { heures, montant }) {
    peut(u, 'clients'); const j = exigeCaisse(S), c = get(S, 'clients', id) || fail('Client introuvable.', 404);
    const h = Number(String(heures).replace(',', '.')); if (!(h > 0)) fail("Nombre d'heures invalide.");
    const m = int(montant); if (m < 0) fail('Montant invalide.');
    c.minutes_prepayees += Math.round(h * 60);
    mouvement(S, j, u, `Carte ${c.carte} · ${h} h prépayées · ${c.nom}`, 'carte', 'Espèces', m, { client_id: c.id });
    log(S, u, `A rechargé ${h} h sur la carte de ${c.nom} (${fmt(m)} DA)`);
  }
  function convertirPoints(S, u, id) {
    peut(u, 'clients'); const c = get(S, 'clients', id), besoin = int(S.params.points_heure_offerte, 100);
    if (c.points < besoin) fail(`Il faut ${besoin} points pour 1 h offerte.`);
    c.points -= besoin; c.minutes_prepayees += 60; log(S, u, `A converti ${besoin} points en 1 h offerte pour ${c.nom}`);
  }
  function reglerCredit(S, u, id, montant) {
    peut(u, 'clients'); const j = exigeCaisse(S), c = get(S, 'clients', id), m = int(montant);
    if (m <= 0 || m > c.credit) fail(`Montant entre 1 et ${fmt(c.credit)} DA.`);
    c.credit -= m; mouvement(S, j, u, `Règlement crédit · ${c.nom}`, 'credit', 'Espèces', m, { client_id: c.id });
    log(S, u, `Règlement de crédit ${c.nom} · ${fmt(m)} DA`);
  }

  // ---------- Tournois ----------
  function tournois(S) { return S.tournois.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)) || b.id - a.id).map(t => ({ ...t, joueurs: S.tjoueurs.filter(x => x.tournoi_id === t.id).length })); }
  function tournoi(S, id) { const t = get(S, 'tournois', id) || fail('Tournoi introuvable.', 404); return { ...t, joueurs: S.tjoueurs.filter(x => x.tournoi_id === t.id), matchs: S.tmatchs.filter(m => m.tournoi_id === t.id).sort((a, b) => a.tour - b.tour || a.position - b.position) }; }
  function creerTournoi(S, u, b) {
    peut(u, 'tournois'); const nom = txt(b.nom, 80) || fail('Nom obligatoire.');
    const t = { id: nid(S, 'tournois'), nom, jeu: txt(b.jeu, 40), date: txt(b.date, 10), inscription: int(b.inscription), cagnotte: int(b.cagnotte), statut: 'inscriptions', cree_le: Date.now() };
    S.tournois.push(t); log(S, u, `A créé le tournoi ${nom}`); return t;
  }
  function inscrire(S, u, id, { nom, paye }) {
    peut(u, 'tournois'); const t = get(S, 'tournois', id); if (t.statut !== 'inscriptions') fail('Les inscriptions sont fermées.', 409);
    nom = txt(nom, 60) || fail('Nom obligatoire.');
    if (S.tjoueurs.some(x => x.tournoi_id === t.id && x.nom.toLowerCase() === nom.toLowerCase())) fail('Ce joueur est déjà inscrit.');
    if (paye && t.inscription) mouvement(S, exigeCaisse(S), u, `Inscription ${t.nom} · ${nom}`, 'tournoi', 'Espèces', t.inscription);
    S.tjoueurs.push({ id: nid(S, 'tjoueurs'), tournoi_id: t.id, nom, paye: !!paye });
  }
  function genererTableau(S, u, id) {
    peut(u, 'tournois'); const t = get(S, 'tournois', id); if (t.statut !== 'inscriptions') fail('Le tableau est déjà généré.', 409);
    const js = S.tjoueurs.filter(x => x.tournoi_id === t.id).map(x => x.nom); if (js.length < 2) fail('Il faut au moins 2 joueurs.');
    for (let i = js.length - 1; i > 0; i--) { const k = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1); [js[i], js[k]] = [js[k], js[i]]; }
    let size = 2; while (size < js.length) size *= 2;
    const slots = [...js, ...Array(size - js.length).fill(null)];
    const add = (tour, position, j1, j2, v) => S.tmatchs.push({ id: nid(S, 'tmatchs'), tournoi_id: t.id, tour, position, j1, j2, s1: null, s2: null, vainqueur: v, poste: '' });
    for (let i = 0; i < size / 2; i++) { const a = slots[i], b = slots[size - 1 - i]; add(1, i, a, b, b === null ? a : null); }
    for (let n = size / 4, tour = 2; n >= 1; n /= 2, tour++) for (let i = 0; i < n; i++) add(tour, i, null, null, null);
    t.statut = 'en_cours'; avancer(S, t.id); log(S, u, `A généré le tableau du tournoi ${t.nom}`);
  }
  function avancer(S, tid) {
    const ms = S.tmatchs.filter(m => m.tournoi_id === tid), max = Math.max(...ms.map(m => m.tour));
    for (const m of ms.sort((a, b) => a.tour - b.tour)) {
      if (m.tour === max) continue;
      const nx = ms.find(x => x.tour === m.tour + 1 && x.position === Math.floor(m.position / 2));
      nx[m.position % 2 === 0 ? 'j1' : 'j2'] = m.vainqueur;
    }
    const fin = ms.find(m => m.tour === max); if (fin.vainqueur) get(S, 'tournois', tid).statut = 'termine';
  }
  function score(S, u, mid, { s1, s2, vainqueur, poste }) {
    peut(u, 'tournois'); const m = get(S, 'tmatchs', mid); if (!m.j1 || !m.j2) fail('Les deux joueurs ne sont pas encore connus.', 409);
    s1 = int(s1, -1); s2 = int(s2, -1); if (s1 < 0 || s2 < 0) fail('Scores invalides.');
    const v = s1 > s2 ? m.j1 : s2 > s1 ? m.j2 : ([m.j1, m.j2].includes(vainqueur) ? vainqueur : null);
    if (!v) fail('Égalité : choisissez le vainqueur aux tirs au but.');
    Object.assign(m, { s1, s2, vainqueur: v, poste: txt(poste, 20) }); avancer(S, m.tournoi_id);
    log(S, u, `Score : ${m.j1} ${s1}–${s2} ${m.j2}`);
  }

  // ---------- Rapports ----------
  function rapport(S, u, du, au) {
    peut(u, 'rapports');
    const parse = s => { const [y, m, d] = String(s || '').split('-').map(Number); return y ? new Date(y, m - 1, d) : null; };
    const A = parse(au) || new Date(); A.setHours(23, 59, 59, 999);
    const D = parse(du) || new Date(A.getFullYear(), A.getMonth(), A.getDate() - 6); D.setHours(0, 0, 0, 0);
    const dans = t => t >= +D && t <= +A;
    const sess = S.sessions.filter(s => s.statut === 'terminee' && dans(s.fin));
    const comptoir = S.ventes_bar.filter(v => !v.session_id && dans(v.date));
    const sessIds = new Set(sess.map(s => s.id));
    const barSess = S.ventes_bar.filter(v => v.session_id && sessIds.has(v.session_id));
    const mvts = S.mouvements.filter(m => dans(m.date));
    const jours = {};
    for (let d = new Date(D); d <= A; d.setDate(d.getDate() + 1)) jours[jj(+d)] = { jour: jj(+d), jeu: 0, bar: 0, autres: 0, total: 0, sessions: 0, minutes: 0 };
    const add = (k, f, v) => { if (jours[k]) jours[k][f] += v; };
    const P = {}, C = {}, F = {}, R = {};
    const nomU = id => get(S, 'users', id)?.nom || '—';
    for (const s of sess) {
      const k = jj(s.fin), rj = Math.min(s.remise, s.montant_jeu), jeu = s.montant_jeu - rj, bar = s.montant_bar - (s.remise - rj);
      add(k, 'jeu', jeu); add(k, 'bar', bar); add(k, 'sessions', 1); add(k, 'minutes', s.minutes);
      const pn = get(S, 'postes', s.poste_id)?.nom || '?';
      const p = P[pn] ||= { nom: pn, sessions: 0, minutes: 0, total: 0 }; p.sessions++; p.minutes += s.minutes; p.total += jeu + bar;
      const cn = nomU(s.user_cloture), c = C[cn] ||= { nom: cn, sessions: 0, jeu: 0, bar: 0, total: 0 }; c.sessions++; c.jeu += jeu; c.bar += bar; c.total += jeu + bar;
      const fn = get(S, 'tarifs', s.tarif_id)?.libelle || '?', f = F[fn] ||= { nom: fn, sessions: 0, minutes: 0, total: 0 }; f.sessions++; f.minutes += s.minutes; f.total += jeu;
    }
    for (const v of comptoir) {
      add(jj(v.date), 'bar', v.qte * v.prix);
      const cn = nomU(v.user_id), c = C[cn] ||= { nom: cn, sessions: 0, jeu: 0, bar: 0, total: 0 }; c.bar += v.qte * v.prix; c.total += v.qte * v.prix;
    }
    for (const v of [...comptoir, ...barSess]) { const r = R[v.produit] ||= { nom: v.produit, qte: 0, ca: 0, marge: 0 }; r.qte += v.qte; r.ca += v.qte * v.prix; r.marge += v.qte * (v.prix - v.prix_achat); }
    for (const m of mvts) if (['carte', 'tournoi', 'credit'].includes(m.categorie)) add(jj(m.date), 'autres', m.montant);
    const liste = Object.values(jours); liste.forEach(d => d.total = d.jeu + d.bar + d.autres);
    const minutes = sess.reduce((a, s) => a + s.minutes, 0), nbPostes = S.postes.filter(p => p.actif).length;
    const cap = nbPostes * int(S.params.heures_ouverture, 14) * 60 * liste.length;
    const sum = f => liste.reduce((a, d) => a + d[f], 0);
    return {
      du: jj(+D), au: jj(+A), jours: liste,
      totaux: { jeu: sum('jeu'), bar: sum('bar'), autres: sum('autres'), total: sum('total'), sessions: sess.length, heures: Math.round(minutes / 6) / 10,
        occupation: cap ? Math.round(minutes / cap * 100) : 0,
        ecart_caisse: S.journees.filter(j => j.cloture && dans(j.cloture)).reduce((a, j) => a + j.ecart, 0),
        depenses: -mvts.filter(m => m.categorie === 'depense').reduce((a, m) => a + m.montant, 0),
        credit_donne: mvts.filter(m => m.mode === 'Crédit').reduce((a, m) => a + m.montant, 0),
        credit_du: S.clients.reduce((a, c) => a + (c.credit || 0), 0) },
      par_poste: Object.values(P).sort((a, b) => b.total - a.total), par_caissier: Object.values(C).sort((a, b) => b.total - a.total),
      par_formule: Object.values(F).sort((a, b) => b.total - a.total), par_produit: Object.values(R).sort((a, b) => b.ca - a.ca)
    };
  }
  function rapportCSV(S, r) {
    const L = [], row = a => L.push(a.map(v => typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v).join(';'));
    row([`${S.params.salle_nom} · Rapport du ${r.du} au ${r.au}`]); row([]);
    row(['Jour', 'Sessions', 'Heures', 'Jeux (DA)', 'Bar (DA)', 'Cartes, tournois, crédits (DA)', 'Total (DA)']);
    r.jours.forEach(d => row([d.jour, d.sessions, Math.round(d.minutes / 6) / 10, d.jeu, d.bar, d.autres, d.total]));
    row(['Total', r.totaux.sessions, r.totaux.heures, r.totaux.jeu, r.totaux.bar, r.totaux.autres, r.totaux.total]); row([]);
    row(['Poste', 'Sessions', 'Heures', 'Total (DA)']); r.par_poste.forEach(p => row([p.nom, p.sessions, Math.round(p.minutes / 6) / 10, p.total])); row([]);
    row(['Caissier', 'Sessions', 'Jeux (DA)', 'Bar (DA)', 'Total (DA)']); r.par_caissier.forEach(c => row([c.nom, c.sessions, c.jeu, c.bar, c.total])); row([]);
    row(['Produit', 'Quantité', 'CA (DA)', 'Marge (DA)']); r.par_produit.forEach(p => row([p.nom, p.qte, p.ca, p.marge])); row([]);
    row([`Période du ${r.du} au ${r.au}`]);
    return '﻿' + L.join('\r\n');
  }

  // ---------- Administration ----------
  async function enregistrerUser(S, u, b) {
    peut(u, 'users'); const nom = txt(b.nom, 40) || fail('Nom obligatoire.');
    if (!ROLES.includes(b.role)) fail('Rôle inconnu.');
    if (b.pin && !/^\d{4,6}$/.test(String(b.pin))) fail('Le code doit faire 4 à 6 chiffres.');
    if (S.users.some(x => x.actif && x.nom.toLowerCase() === nom.toLowerCase() && x.id !== Number(b.id))) fail('Ce nom est déjà utilisé.');
    if (b.id) {
      const x = get(S, 'users', b.id);
      if (x.id === u.id && b.role !== 'Admin') fail('Vous ne pouvez pas retirer vos propres droits admin.');
      Object.assign(x, { nom, role: b.role }); if (b.pin) x.pin = await hashPin(b.pin);
      log(S, u, `A modifié l'utilisateur ${nom} (${b.role})`);
    } else {
      if (!b.pin) fail('Code PIN obligatoire.');
      S.users.push({ id: nid(S, 'users'), nom, role: b.role, pin: await hashPin(b.pin), actif: true, cree_le: Date.now() });
      log(S, u, `A créé l'utilisateur ${nom} (${b.role})`);
    }
  }
  function supprimerUser(S, u, id) {
    peut(u, 'users'); const x = get(S, 'users', id); if (x.id === u.id) fail('Vous ne pouvez pas supprimer votre propre compte.');
    if (x.role === 'Admin' && S.users.filter(y => y.actif && y.role === 'Admin').length < 2) fail('Il doit rester au moins un admin.');
    x.actif = false; log(S, u, `A supprimé l'utilisateur ${x.nom}`);
  }
  function enregistrerParams(S, u, b) {
    peut(u, 'params');
    for (const k of Object.keys(PARAMS_DEFAUT)) if (k in b) S.params[k] = typeof PARAMS_DEFAUT[k] === 'number' ? int(b[k], PARAMS_DEFAUT[k]) : typeof PARAMS_DEFAUT[k] === 'boolean' ? !!b[k] : txt(b[k], 60);
    log(S, u, 'A modifié les paramètres');
  }
  function enregistrerPoste(S, u, b) {
    peut(u, 'params'); const nom = txt(b.nom, 20) || fail('Nom obligatoire.');
    if (S.postes.some(p => p.actif && p.nom.toLowerCase() === nom.toLowerCase() && p.id !== Number(b.id))) fail('Un poste porte déjà ce nom.');
    const v = { nom, console: txt(b.console, 20) || 'PS5', ecran: txt(b.ecran, 20), manettes: Math.max(1, int(b.manettes, 2)) };
    if (b.id) Object.assign(get(S, 'postes', b.id), v);
    else S.postes.push({ id: nid(S, 'postes'), ...v, ordre: Math.max(0, ...S.postes.map(p => p.ordre)) + 1, actif: true });
    log(S, u, `A enregistré le poste ${nom}`);
  }
  function supprimerPoste(S, u, id) {
    peut(u, 'params'); const p = get(S, 'postes', id);
    if (!libre(S, p.id)) fail('Ce poste est occupé. Encaissez-le avant de le supprimer.', 409);
    p.actif = false; log(S, u, `A supprimé le poste ${p.nom}`);
  }
  function enregistrerTarif(S, u, b) {
    peut(u, 'params'); const libelle = txt(b.libelle, 60) || fail('Libellé obligatoire.');
    if (!['heure', 'match', 'forfait'].includes(b.type)) fail('Type inconnu.');
    if (int(b.prix) <= 0) fail('Prix invalide.');
    if (b.type !== 'heure' && int(b.duree_min) <= 0) fail('Durée obligatoire pour un match ou un forfait.');
    const v = { libelle, type: b.type, prix: int(b.prix), duree_min: b.type === 'heure' ? 0 : int(b.duree_min), depassement_heure: b.type === 'forfait' ? int(b.depassement_heure) : 0 };
    if (b.id) Object.assign(get(S, 'tarifs', b.id), v);
    else S.tarifs.push({ id: nid(S, 'tarifs'), ...v, ordre: Math.max(0, ...S.tarifs.map(t => t.ordre)) + 1, actif: true });
    log(S, u, `A enregistré le tarif ${libelle} (${fmt(v.prix)} DA)`);
  }
  function supprimerTarif(S, u, id) {
    peut(u, 'params'); const t = get(S, 'tarifs', id);
    if (actives(S).some(s => s.tarif_id === t.id)) fail('Ce tarif est utilisé par une session en cours.', 409);
    if (S.tarifs.filter(x => x.actif).length < 2) fail('Il faut garder au moins un tarif.');
    t.actif = false; log(S, u, `A supprimé le tarif ${t.libelle}`);
  }
  function deplacer(S, u, table, id, sens) {
    peut(u, 'params'); const l = S[table].filter(x => x.actif).sort((a, b) => a.ordre - b.ordre);
    const i = l.findIndex(x => x.id === Number(id)), k = i + sens; if (k < 0 || k >= l.length) return;
    [l[i], l[k]] = [l[k], l[i]]; l.forEach((x, n) => x.ordre = n);
  }

  // Remise à zéro : efface toutes les opérations, garde les réglages, postes, tarifs, produits (avec leur stock actuel), clients et utilisateurs
  const CODE_REINIT = 'LB7Z';
  function reinitialiser(S, u, code) {
    peut(u, 'params');
    if (String(code || '').trim().toUpperCase() !== CODE_REINIT) fail('Code de réinitialisation incorrect.', 403);
    for (const t of ['sessions', 'ventes_bar', 'mvt_stock', 'journees', 'mouvements', 'tournois', 'tjoueurs', 'tmatchs', 'journal']) { S[t] = []; S.seq[t] = 0; }
    for (const c of S.clients) Object.assign(c, { minutes_prepayees: 0, points: 0, credit: 0, derniere_visite: null });
    delete S.derniere_sauvegarde;
    log(S, u, 'Réinitialisation complète des opérations');
  }

  root.Core = {
    ROLES, DROITS, PARAMS_DEFAUT, ErreurMetier, fmt, jj, int,
    etatVide, initialiser, connexion, changerPin, prixJeu, minutesJouees,
    etat, demarrer, pause, changerPoste, changerFormule, associerClient, annuler, apercu, encaisser,
    venteBar, retirerLigneBar, enregistrerProduit, supprimerProduit, mouvementStock,
    caisse, ouvrirCaisse, mouvementCaisse, cloturerCaisse,
    clients, enregistrerClient, rechargerClient, convertirPoints, reglerCredit,
    tournois, tournoi, creerTournoi, inscrire, genererTableau, score,
    rapport, rapportCSV, enregistrerUser, supprimerUser, enregistrerParams,
    enregistrerPoste, supprimerPoste, enregistrerTarif, supprimerTarif, deplacer, reinitialiser
  };
})(typeof window !== 'undefined' ? window : globalThis);
