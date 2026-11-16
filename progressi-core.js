/* =========================================================
   progressi-core.js — progressi dell'utente (nessun DOM)
   Registra risultati per esercizio (carico, ripetizioni, tempi, serie,
   recuperi, sensazione) e feedback di sessione; li elabora per adattare
   gli allenamenti di TUTTE le sezioni (WOD di Oggi, HIFT Method) in base
   all'obiettivo. Usabile nel browser (window.HiftProgressi) e in Node.
   ========================================================= */
(function (root, factory) {
  var m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else root.HiftProgressi = m;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DAY = 864e5;
  var ESITI = { facile: 'Facile', giusto: 'Giusto', duro: 'Duro' };
  var REC = { corti: 'Troppo brevi', giusti: 'Giusti', lunghi: 'Troppo lunghi' };

  /* strategia di progressione per obiettivo */
  var GOALS = {
    forza: {
      vol: { facile: 1.04, giusto: 1.0, duro: 0.92 }, kg: { facile: 1.05, giusto: 1.025, duro: 0.95 },
      dens: 0, rpe: [7, 9],
      txt: 'Forza: prima cresce il carico, le ripetizioni restano basse e i recuperi completi.'
    },
    potenza: {
      vol: { facile: 1.03, giusto: 1.0, duro: 0.9 }, kg: { facile: 1.04, giusto: 1.02, duro: 0.95 },
      dens: 0, rpe: [7, 9],
      txt: 'Potenza: qualità ed esplosività prima del volume; recuperi completi, piccoli aumenti di carico.'
    },
    dimagrimento: {
      vol: { facile: 1.1, giusto: 1.05, duro: 0.9 }, kg: { facile: 1.025, giusto: 1.0, duro: 0.95 },
      dens: 1, rpe: [7, 9],
      txt: 'Dimagrimento: più lavoro nello stesso tempo, recuperi che si accorciano quando reggi bene.'
    },
    resistenza: {
      vol: { facile: 1.1, giusto: 1.05, duro: 0.9 }, kg: { facile: 1.025, giusto: 1.0, duro: 0.95 },
      dens: 1, rpe: [6, 8],
      txt: 'Resistenza: crescono ripetizioni, tempi di lavoro e giri; i recuperi si riducono gradualmente.'
    },
    salute: {
      vol: { facile: 1.05, giusto: 1.02, duro: 0.9 }, kg: { facile: 1.025, giusto: 1.0, duro: 0.95 },
      dens: 0.5, rpe: [5, 7],
      txt: 'Salute e benessere: progressione lenta, lo sforzo resta moderato.'
    }
  };
  function goalOf(g) { return GOALS[g] || GOALS.salute; }

  var num = function (v, lo, hi) {
    if (v == null || v === '') return null;
    var n = parseFloat(String(v).replace(',', '.'));
    if (!isFinite(n)) return null;
    return Math.min(hi, Math.max(lo, n));
  };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  function keyOf(src, id) { return (src === 'hift' ? 'h:' : 'w:') + id; }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  /* ---------------- dati ---------------- */
  function empty() { return { v: 1, on: true, entries: [], sessions: [] }; }
  function load(raw) {
    var p = raw && typeof raw === 'object' ? raw : empty();
    if (!Array.isArray(p.entries)) p.entries = [];
    if (!Array.isArray(p.sessions)) p.sessions = [];
    if (p.on == null) p.on = true;
    return p;
  }
  /* una misura per esercizio: tutti i campi facoltativi tranne chiave e data */
  function cleanEntry(e) {
    if (!e || !e.k) return null;
    var o = {
      id: e.id || uid(), d: e.d || new Date().toISOString(), k: String(e.k), nome: String(e.nome || e.k),
      src: e.src === 'hift' ? 'hift' : e.src === 'manuale' ? 'manuale' : 'wod',
      kg: num(e.kg, 0, 500), rip: num(e.rip, 0, 1000), sec: num(e.sec, 0, 7200), serie: num(e.serie, 0, 50), rec: num(e.rec, 0, 900),
      esito: ESITI[e.esito] ? e.esito : null,
      target: num(e.target, 0, 1000), targetSec: num(e.targetSec, 0, 7200), fat: num(e.fat, 0.3, 3),
      sid: e.sid || null, note: e.note ? String(e.note).slice(0, 200) : ''
    };
    if (o.rip != null) o.rip = Math.round(o.rip);
    if (o.serie != null) o.serie = Math.round(o.serie);
    var has = o.kg != null || o.rip != null || o.sec != null || o.serie != null || o.rec != null || o.esito;
    return has ? o : null;
  }
  function addEntries(p, list) {
    var added = 0;
    (list || []).forEach(function (e) { var c = cleanEntry(e); if (c) { p.entries.unshift(c); added++; } });
    p.entries.sort(function (a, b) { return String(b.d).localeCompare(String(a.d)); });
    if (p.entries.length > 3000) p.entries.length = 3000;
    return added;
  }
  function addSession(p, s) {
    var o = {
      id: s.id || uid(), d: s.d || new Date().toISOString(), src: s.src === 'hift' ? 'hift' : 'wod', title: String(s.title || ''),
      rpe: num(s.rpe, 1, 10), rec: REC[s.rec] ? s.rec : null, giri: num(s.giri, 0, 500), tempo: num(s.tempo, 0, 36000), obiettivo: s.obiettivo || ''
    };
    p.sessions.unshift(o);
    if (p.sessions.length > 400) p.sessions.length = 400;
    return o;
  }
  function removeEntry(p, id) { var n = p.entries.length; p.entries = p.entries.filter(function (e) { return e.id !== id; }); return n !== p.entries.length; }
  function historyOf(p, key) { return p.entries.filter(function (e) { return e.k === key; }); }

  /* ---------------- elaborazione per esercizio ---------------- */
  function roundKg(x) {
    if (x < 10) return Math.round(x * 2) / 2;
    if (x < 40) return Math.round(x);
    return Math.round(x / 2.5) * 2.5;
  }
  function detrain(f, days) {
    if (f <= 1) return f;
    if (days > 60) return 1 + (f - 1) * 0.2;
    if (days > 21) return 1 + (f - 1) * 0.5;
    return f;
  }
  function exState(p, key, goal, now) {
    now = now || Date.now();
    var H = historyOf(p, key), G = goalOf(goal);
    if (!H.length) return null;
    var last = H[0];
    var best = { kg: null, rip: null, sec: null };
    H.forEach(function (e) {
      ['kg', 'rip', 'sec'].forEach(function (k) { if (e[k] != null && (best[k] == null || e[k] > best[k])) best[k] = e[k]; });
    });
    // andamento: confronta la media delle ultime 2 con le 2 precedenti (sulla misura principale)
    var main = last.kg != null ? 'kg' : last.rip != null ? 'rip' : last.sec != null ? 'sec' : null;
    var trend = null;
    if (main) {
      var vals = H.map(function (e) { return e[main]; }).filter(function (v) { return v != null; });
      if (vals.length >= 3) {
        var a = (vals[0] + vals[1]) / 2, b = vals.slice(2, 4).reduce(function (s, v) { return s + v; }, 0) / vals.slice(2, 4).length;
        trend = a > b * 1.03 ? 'su' : a < b * 0.97 ? 'giu' : 'stabile';
      }
    }
    // fattore di volume: quello usato l'ultima volta × risposta (sensazione + ripetizioni fatte rispetto all'obiettivo)
    var ratio = last.target && last.rip != null ? last.rip / last.target : last.targetSec && last.sec != null ? last.sec / last.targetSec : null;
    var adj = last.esito ? G.vol[last.esito] : 1;
    if (ratio != null) adj *= Math.sqrt(clamp(ratio, 0.8, 1.25));
    var days = (now - new Date(last.d).getTime()) / DAY;
    var fattore = clamp(detrain((last.fat || 1) * adj, days), 0.6, 1.8);
    // carico suggerito
    var kg = null;
    if (last.kg != null && last.kg > 0) {
      var m = last.esito ? G.kg[last.esito] : 1;
      if (ratio != null && ratio < 0.85) m = Math.min(m, 1);
      if (days > 21) m = Math.min(m, 1);
      kg = roundKg(last.kg * m);
    }
    var nota = [];
    if (last.esito) nota.push('ultima volta ' + ESITI[last.esito].toLowerCase());
    if (ratio != null) nota.push(Math.round(ratio * 100) + '% dell\'obiettivo');
    if (days > 21) nota.push('pausa di ' + Math.round(days) + ' giorni: ripresa graduale');
    return { key: key, nome: last.nome, n: H.length, last: last, best: best, trend: trend, main: main, fattore: fattore, kg: kg, giorni: days, nota: nota.join(' · ') };
  }

  /* ---------------- stato generale ---------------- */
  function sessionScore(s, esitiMap, G) {
    var parts = [];
    if (s.rpe != null) parts.push(s.rpe < G.rpe[0] ? 1 : s.rpe > G.rpe[1] ? -1 : 0.3);
    var es = esitiMap[s.id];
    if (es && es.length) parts.push(es.reduce(function (a, e) { return a + (e === 'facile' ? 1 : e === 'duro' ? -1 : 0.3); }, 0) / es.length);
    return parts.length ? parts.reduce(function (a, b) { return a + b; }, 0) / parts.length : null;
  }
  function globalState(p, goal, level, now) {
    now = now || Date.now();
    var G = goalOf(goal);
    var esitiMap = {};
    p.entries.forEach(function (e) { if (e.sid && e.esito) (esitiMap[e.sid] = esitiMap[e.sid] || []).push(e.esito); });
    var recent = p.sessions.filter(function (s) { return now - new Date(s.d).getTime() < 45 * DAY; }).slice(0, 6);
    var sum = 0, used = 0, rec = 0, motivi = [];
    recent.forEach(function (s, i) {
      var sc = sessionScore(s, esitiMap, G);
      if (sc != null) { sum += sc * (1 - i * 0.1); used++; }
      if (s.rec === 'corti') rec += 5; else if (s.rec === 'lunghi') rec -= 5;
    });
    var g = clamp(1 + 0.05 * sum, 0.75, 1.35);
    if (G.dens && g > 1.1) rec -= Math.round(5 * G.dens);
    rec = clamp(rec, -20, 30);
    if (used) motivi.push(used + ' sessioni recenti valutate: carico di lavoro ' + (g > 1.02 ? 'in aumento del ' + Math.round((g - 1) * 100) + '%' : g < 0.98 ? 'ridotto del ' + Math.round((1 - g) * 100) + '%' : 'stabile') + '.');
    if (rec) motivi.push('Recuperi ' + (rec > 0 ? 'più lunghi di ' + rec + '"' : 'più brevi di ' + (-rec) + '"') + ' in base al tuo riscontro' + (G.dens && g > 1.1 ? ' e all\'obiettivo' : '') + '.');
    var livello = null;
    if (used >= 4 && g >= 1.2 && level < 3) livello = { verso: 'su', a: level + 1 };
    else if (used >= 3 && g <= 0.85 && level > 1) livello = { verso: 'giu', a: level - 1 };
    return { g: g, rec: rec, n: used, livello: livello, motivi: motivi, strategia: G.txt, attivo: used > 0 || rec !== 0 };
  }

  /* ---------------- adattamenti ---------------- */
  function steps(gs, goal) {
    var s = clamp(Math.round((gs.g - 1) / 0.1), -3, 3);
    if (goal === 'salute') s = s > 0 ? Math.floor(s / 2) : s;
    return s;
  }
  /* parametri del circuito HIFT (il CORE non si tocca: regole fisse del metodo) */
  function adaptHift(method, params, gs, goal) {
    var P = Object.assign({}, params), ch = [], s = steps(gs, goal), G = goalOf(goal), r = gs.rec;
    var base = Object.assign({}, params);
    // limiti per singolo adattamento: niente salti bruschi rispetto ai parametri di partenza
    var BOUND = { lavoro: [0.8, 1.25], rip: [0.8, 1.25], recupero: [0.7, 1.4], cambio: [0.7, 1.4], recGiri: [0.6, 1.5], pctLavoro: [0.85, 1.15] };
    function set(k, v, lab, u) {
      if (P[k] == null) return;
      var b0 = base[k];
      if (BOUND[k] && b0) v = clamp(v, b0 * BOUND[k][0], b0 * BOUND[k][1]);
      if (k === 'giri') v = clamp(v, b0 - 1, b0 + 1);
      if ((k === 'recupero' || k === 'cambio') && b0 >= 10) v = Math.max(10, v);
      v = u === '"' ? Math.round(v / 5) * 5 : Math.round(v);
      if (v === P[k]) return;
      ch.push(lab + ' ' + P[k] + (u || '') + ' → ' + v + (u || '')); P[k] = v;
    }
    var dens = G.dens > 0;
    if (method === 'tempo' || method === 'intervalli' || method === 'personalizzato') {
      if (goal !== 'forza' && goal !== 'potenza') set('lavoro', P.lavoro + 5 * s, 'Lavoro', '"');
      var rk = method === 'intervalli' ? 'recupero' : 'recupero';
      set(rk, Math.max(5, P[rk] + r - (dens ? 5 * Math.max(0, s) : 0)), method === 'intervalli' ? 'Recupero tra le serie' : 'Recupero', '"');
      if (method === 'intervalli') set('cambio', Math.max(10, P.cambio + r), 'Recupero tra stazioni', '"');
    }
    if (method === 'fisso') set('pctLavoro', P.pctLavoro + 3 * s - Math.round(r / 5) * 2, 'Lavoro sul tempo', '%');
    if (method === 'ripetizioni') { set('rip', P.rip * (1 + 0.08 * s), 'Ripetizioni'); set('cambio', Math.max(10, P.cambio + r), 'Recupero tra stazioni', '"'); }
    if (method === 'personalizzato' && goal === 'forza') set('rip', (P.rip || 12) * (1 + 0.05 * s), 'Ripetizioni');
    if (P.giri != null && method !== 'fisso') {
      if (s >= 2 && (dens || goal === 'salute')) set('giri', P.giri + 1, 'Giri');
      else if (s <= -2 && P.giri > 1) set('giri', P.giri - 1, 'Giri');
    }
    if (P.recGiri != null) set('recGiri', Math.max(0, P.recGiri + r * 2), 'Recupero tra i giri', '"');
    return { params: P, changes: ch };
  }
  /* WOD: secondi di lavoro negli intervalli (slot da 60") e recupero dei blocchi di forza */
  function wodInterval(baseW, gs, goal) {
    var s = steps(gs, goal), G = goalOf(goal);
    var w = baseW + (G.dens ? 5 * s : goal === 'salute' ? 2 * s : 0) - Math.round(gs.rec / 5) * 2;
    return clamp(Math.round(w / 5) * 5, 20, 50);
  }
  function strengthRest(base, gs) { return clamp(base + gs.rec, 60, 240); }

  /* ---------------- riepilogo per la pagina Progressi ---------------- */
  function summaryAll(p, goal, now) {
    var keys = [];
    p.entries.forEach(function (e) { if (keys.indexOf(e.k) < 0) keys.push(e.k); });
    return keys.map(function (k) {
      var st = exState(p, k, goal, now), H = historyOf(p, k);
      st.serie = H.slice(0, 12).reverse().map(function (e) { return st.main ? e[st.main] : null; });
      return st;
    });
  }
  function firstNum(txt) { var m = String(txt || '').match(/(\d+(?:[.,]\d+)?)/); return m ? parseFloat(m[1].replace(',', '.')) : null; }

  return {
    ESITI: ESITI, REC: REC, GOALS: GOALS, keyOf: keyOf, empty: empty, load: load, cleanEntry: cleanEntry,
    addEntries: addEntries, addSession: addSession, removeEntry: removeEntry, historyOf: historyOf,
    exState: exState, globalState: globalState, adaptHift: adaptHift, wodInterval: wodInterval, strengthRest: strengthRest,
    summaryAll: summaryAll, roundKg: roundKg, firstNum: firstNum
  };
});
