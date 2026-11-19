/* Stockage local sur le téléphone (IndexedDB), avec repli sur localStorage.
   Toute la base tient dans un seul enregistrement JSON, réécrit après chaque opération. */
(function (root) {
  'use strict';
  const DB = 'salle-ps5', OS = 'etat', KEY = 'principal', LS = 'salle-ps5-etat';
  let idb = null;

  function ouvrir() {
    return new Promise(res => {
      try {
        const r = indexedDB.open(DB, 1);
        r.onupgradeneeded = () => r.result.createObjectStore(OS);
        r.onsuccess = () => { idb = r.result; res(idb); };
        r.onerror = () => res(null);
      } catch { res(null); }
    });
  }
  function lireIDB() {
    return new Promise(res => {
      try { const q = idb.transaction(OS).objectStore(OS).get(KEY); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }
      catch { res(null); }
    });
  }
  function ecrireIDB(v) {
    return new Promise((res, rej) => {
      try { const tx = idb.transaction(OS, 'readwrite'); tx.objectStore(OS).put(v, KEY); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); }
      catch (e) { rej(e); }
    });
  }
  const propre = S => { const c = { ...S }; delete c._mem; return JSON.parse(JSON.stringify(c)); };

  const Store = {
    async charger() {
      await ouvrir();
      let S = idb ? await lireIDB() : null;
      if (!S) { try { S = JSON.parse(localStorage.getItem(LS) || 'null'); } catch { S = null; } }
      try { if (navigator.storage?.persist) await navigator.storage.persist(); } catch {}
      return S;
    },
    async enregistrer(S) {
      const v = propre(S);
      v.enregistre_le = Date.now();
      if (idb) { try { await ecrireIDB(v); return; } catch (e) { console.warn('IndexedDB', e); } }
      localStorage.setItem(LS, JSON.stringify(v));
    },
    exporter(S) { return JSON.stringify({ app: 'salle-ps5', exporte_le: Date.now(), etat: propre(S) }); },
    importer(texte) {
      const o = JSON.parse(texte);
      if (o?.app !== 'salle-ps5' || !o.etat?.users) throw new Error("Ce fichier n'est pas une sauvegarde de l'appli.");
      return o.etat;
    }
  };
  root.Store = Store;
})(window);
