/* =========================================================
   programma-core.js — programmi di allenamento personali (nessun DOM)
   - parametri per obiettivo dalle linee guida della programmazione
     (ACSM Position Stand 2009, NSCA Essentials 4ª ed., Schoenfeld 2017 sul
     volume, Grgic 2018 sulla frequenza)
   - proposta automatica, espansione settimana per settimana con
     progressione e scarichi, controllo delle regole
   - esportazione: JSON, CSV, Excel (.xls XML), iCalendar, testo, Markdown, HTML
   Usabile nel browser (window.HiftProgramma) e in Node.
   ========================================================= */
(function (root, factory) {
  var m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else root.HiftProgramma = m;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DAY = 864e5;
  var WD = ['', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
  var WDS = ['', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
  var GRUPPI = { petto: 'Petto', dorso: 'Dorso', spalle: 'Spalle', quadricipiti: 'Quadricipiti', glutei: 'Glutei e femorali', core: 'Core', cardio: 'Cardio', total: 'Total body' };
  var MUSCOLARI = ['petto', 'dorso', 'spalle', 'quadricipiti', 'glutei', 'core'];

  /* parametri per obiettivo: ripetizioni, serie per esercizio, recupero (s), RIR,
     % del massimale, serie settimanali per gruppo muscolare, incremento settimanale del carico */
  var OBIETTIVI = {
    forza: { n: 'Forza', rip: [3, 6], ripCL: [6, 10], serie: [3, 6], rec: [120, 300], rir: [1, 3], pct: [80, 90], vol: [8, 16], inc: 0.025, sec: [20, 30],
      fonte: 'ACSM 2009 / NSCA: 1–6 ripetizioni all\'80–90% del massimale, 3–6 serie, recuperi di 2–5 minuti.' },
    ipertrofia: { n: 'Ipertrofia', rip: [6, 12], serie: [3, 5], rec: [60, 120], rir: [0, 3], pct: [65, 80], vol: [10, 20], inc: 0.02, sec: [30, 45],
      fonte: 'ACSM 2009, Schoenfeld 2017: 6–12 ripetizioni vicino al cedimento, 10–20 serie settimanali per muscolo, recuperi di 1–2 minuti.' },
    potenza: { n: 'Potenza', rip: [1, 5], serie: [3, 5], rec: [120, 300], rir: [2, 4], pct: [30, 70], vol: [6, 12], inc: 0.02, sec: [10, 20],
      fonte: 'NSCA: 1–5 ripetizioni esplosive al 30–70% del massimale, recuperi completi di 2–5 minuti, lontano dal cedimento.' },
    resistenza: { n: 'Resistenza muscolare', rip: [12, 25], serie: [2, 4], rec: [30, 60], rir: [1, 3], pct: [40, 65], vol: [8, 16], inc: 0.015, sec: [40, 60],
      fonte: 'ACSM 2009: 12–25 ripetizioni con carichi leggeri, 2–4 serie, recuperi brevi (30–60 s).' },
    dimagrimento: { n: 'Dimagrimento', rip: [10, 15], serie: [2, 4], rec: [30, 75], rir: [1, 3], pct: [60, 75], vol: [10, 18], inc: 0.015, sec: [30, 45],
      fonte: 'Allenamento di forza metabolico: 10–15 ripetizioni, recuperi brevi e densità alta per aumentare il dispendio, mantenendo il muscolo.' },
    salute: { n: 'Salute e benessere', rip: [8, 15], serie: [1, 3], rec: [60, 120], rir: [2, 4], pct: [50, 70], vol: [4, 12], inc: 0.01, sec: [20, 40],
      fonte: 'ACSM: 2–3 sedute a settimana, 8–15 ripetizioni senza arrivare al cedimento, tutti i grandi gruppi muscolari.' }
  };
  var MODELLI = {
    lineare: { n: 'Lineare', d: 'Ogni settimana un piccolo aumento: carico (o ripetizioni, se l\'esercizio è senza carico).' },
    ondulata: { n: 'Ondulata', d: 'Nella settimana i giorni alternano pesante, medio e leggero; la progressione resta settimanale.' },
    blocchi: { n: 'A blocchi', d: 'Tre fasi: accumulo (più volume), trasformazione, realizzazione (più intensità).' }
  };
  var LIVELLI = ['', 'Principiante', 'Intermedio', 'Avanzato'];

  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var num = function (v, a, b, d) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? clamp(n, a, b) : d; };
  var mid = function (r) { return Math.round((r[0] + r[1]) / 2); };
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function roundKg(x) { if (!x) return x; if (x < 10) return Math.round(x * 2) / 2; if (x < 40) return Math.round(x); return Math.round(x / 2.5) * 2.5; }
  var fmtN = function (v) { return String(Math.round(v * 10) / 10).replace('.', ','); };

  /* gruppi muscolari dal testo (muscoli o distretto) */
  var GW = [['petto', /pettoral|petto|chest/], ['dorso', /dorsal|dorso|romboid|trapez|lats|schiena alta/], ['spalle', /deltoid|spall/], ['quadricipiti', /quadricip/], ['glutei', /glute|femoral|ischio/], ['core', /addom|core|obliqu|trasvers|retto/]];
  function gruppiDaTesto(t) {
    t = String(t || '').toLowerCase();
    var out = [];
    GW.forEach(function (g) { if (g[1].test(t) && out.indexOf(g[0]) < 0) out.push(g[0]); });
    return out;
  }

  /* ---------------- modello del programma ---------------- */
  function nuovoEsercizio(c, ob, livello) {
    var O = OBIETTIVI[ob] || OBIETTIVI.salute, tempo = c.unita === 'sec';
    var serie = livello === 1 ? O.serie[0] : mid(O.serie);
    var core = (c.gruppi || [])[0] === 'core';
    // core: stabilità e resistenza del tronco, 8–12 ripetizioni (o tenute) qualunque sia l'obiettivo; forza a corpo libero: 6–10 con la variante più dura
    var rr = core ? [8, 12] : !c.carico && O.ripCL ? O.ripCL : O.rip;
    return {
      id: uid(), k: c.k, nome: c.nome, gruppi: c.gruppi || [], unita: c.unita || 'rip', carico: !!c.carico,
      serie: serie, ripMin: tempo ? null : rr[0], ripMax: tempo ? null : rr[1], sec: tempo ? mid(O.sec) : null,
      kg: null, pct: c.carico && !core ? (livello === 1 ? O.pct[0] : mid(O.pct)) : null, rec: mid(O.rec), rir: mid(O.rir),
      note: !c.carico && O.ripCL && !tempo && !core ? 'Scegli la variante più difficile che ti permette 6–10 ripetizioni' : ''
    };
  }
  function vuoto(o) {
    o = o || {};
    return {
      v: 1, id: uid(), nome: o.nome || 'Il mio programma', obiettivo: OBIETTIVI[o.obiettivo] ? o.obiettivo : 'ipertrofia',
      livello: clamp(+o.livello || 2, 1, 3), settimane: clamp(+o.settimane || 8, 1, 52), inizio: o.inizio || new Date().toISOString().slice(0, 10),
      modello: MODELLI[o.modello] ? o.modello : 'lineare', scarico: o.scarico == null ? 4 : clamp(+o.scarico, 0, 8), ora: o.ora || '18:00',
      giorni: [], fatte: [], creato: new Date().toISOString(), modificato: new Date().toISOString()
    };
  }
  function nuovoGiorno(p, wd, nome) {
    var g = { id: uid(), wd: clamp(+wd || 1, 1, 7), nome: nome || 'Giorno ' + String.fromCharCode(65 + p.giorni.length), esercizi: [] };
    p.giorni.push(g); p.giorni.sort(function (a, b) { return a.wd - b.wd; });
    return g;
  }
  function pulisci(p) {
    var q = vuoto(p);
    q.id = p.id || q.id; q.creato = p.creato || q.creato; q.modificato = p.modificato || q.modificato;
    q.fatte = Array.isArray(p.fatte) ? p.fatte.filter(function (f) { return f && f.w != null && f.g; }) : [];
    q.giorni = (Array.isArray(p.giorni) ? p.giorni : []).slice(0, 7).map(function (g) {
      return {
        id: g.id || uid(), wd: clamp(+g.wd || 1, 1, 7), nome: String(g.nome || 'Giorno').slice(0, 40),
        esercizi: (Array.isArray(g.esercizi) ? g.esercizi : []).slice(0, 20).filter(function (e) { return e && e.k && e.nome; }).map(function (e) {
          var tempo = e.unita === 'sec';
          var o = {
            id: e.id || uid(), k: String(e.k), nome: String(e.nome).slice(0, 80), gruppi: Array.isArray(e.gruppi) ? e.gruppi.filter(function (x) { return GRUPPI[x]; }) : [],
            unita: ['rip', 'sec', 'm', 'cal'].indexOf(e.unita) >= 0 ? e.unita : 'rip', carico: !!e.carico,
            serie: Math.round(num(e.serie, 1, 12, 3)),
            ripMin: tempo ? null : Math.round(num(e.ripMin, 1, 100, 8)), ripMax: tempo ? null : Math.round(num(e.ripMax, 1, 100, num(e.ripMin, 1, 100, 10))),
            sec: tempo ? Math.round(num(e.sec, 5, 600, 30)) : null,
            kg: e.kg == null || e.kg === '' ? null : num(e.kg, 0, 500, null), pct: e.pct == null || e.pct === '' ? null : Math.round(num(e.pct, 20, 100, null)),
            rec: Math.round(num(e.rec, 0, 600, 90)), rir: Math.round(num(e.rir, 0, 5, 2)), note: String(e.note || '').slice(0, 200)
          };
          if (o.ripMax != null && o.ripMax < o.ripMin) { var t = o.ripMin; o.ripMin = o.ripMax; o.ripMax = t; }
          return o;
        })
      };
    }).sort(function (a, b) { return a.wd - b.wd; });
    return q;
  }

  /* ---------------- proposta automatica ---------------- */
  var SPLIT = {
    1: [['Total body', ['quadricipiti', 'petto', 'dorso', 'glutei', 'spalle', 'core']]],
    2: [['Total body A', ['quadricipiti', 'petto', 'dorso', 'glutei', 'core']], ['Total body B', ['glutei', 'spalle', 'dorso', 'quadricipiti', 'core']]],
    3: [['Total body A', ['quadricipiti', 'petto', 'dorso', 'core']], ['Total body B', ['glutei', 'spalle', 'dorso', 'core']], ['Total body C', ['quadricipiti', 'petto', 'glutei', 'core']]],
    4: [['Parte alta A', ['petto', 'dorso', 'spalle', 'core']], ['Parte bassa A', ['quadricipiti', 'glutei', 'core']], ['Parte alta B', ['dorso', 'petto', 'spalle', 'core']], ['Parte bassa B', ['glutei', 'quadricipiti', 'core']]],
    5: [['Parte alta', ['petto', 'dorso', 'spalle', 'core']], ['Parte bassa', ['quadricipiti', 'glutei', 'core']], ['Spinta', ['petto', 'spalle', 'core']], ['Trazione', ['dorso', 'glutei', 'core']], ['Gambe', ['quadricipiti', 'glutei', 'core']]],
    6: [['Spinta A', ['petto', 'spalle', 'core']], ['Trazione A', ['dorso', 'glutei', 'core']], ['Gambe A', ['quadricipiti', 'glutei', 'core']], ['Spinta B', ['spalle', 'petto', 'core']], ['Trazione B', ['dorso', 'core']], ['Gambe B', ['glutei', 'quadricipiti', 'core']]]
  };
  var DEF_WD = { 1: [3], 2: [2, 5], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 5, 6], 6: [1, 2, 3, 4, 5, 6] };
  /* catalogo: [{k, nome, gruppi:[primario, ...], unita, carico, livello, multi}] già filtrato per attrezzatura */
  function proposta(opt, catalogo) {
    var p = vuoto(opt), wds = (opt.wd && opt.wd.length ? opt.wd : DEF_WD[clamp(+opt.giorni || 3, 1, 6)]).slice(0, 6).sort();
    var split = SPLIT[clamp(wds.length, 1, 6)];
    var used = {}, cat = catalogo.filter(function (c) { return c.livello == null || c.livello <= p.livello; });
    var pref = function (c) { // multiarticolari e con carico prima, per gli obiettivi di forza
      var s = 0;
      if (c.multi) s += 2;
      if (c.carico && (p.obiettivo === 'forza' || p.obiettivo === 'potenza' || p.obiettivo === 'ipertrofia')) s += 2;
      if (c.livello === p.livello) s += 1;
      if (used[c.k]) s -= 10;
      return s;
    };
    wds.forEach(function (wd, i) {
      var sp = split[i % split.length], g = nuovoGiorno(p, wd, sp[0]);
      sp[1].forEach(function (gr, j) {
        var cands = cat.filter(function (c) { return c.gruppi[0] === gr && !g.esercizi.some(function (e) { return e.k === c.k; }); });
        if (!cands.length) return;
        cands.sort(function (a, b) { return pref(b) - pref(a) || (a.k < b.k ? -1 : 1); });
        // rotazione tra i giorni, ma solo tra i candidati migliori
        var top = cands.filter(function (c) { return pref(c) === pref(cands[0]); });
        var c = top[(i + j) % Math.min(3, top.length)];
        used[c.k] = 1;
        var e = nuovoEsercizio(c, p.obiettivo, p.livello);
        if (gr === 'core') { var O = OBIETTIVI[p.obiettivo]; e.serie = Math.max(2, O.serie[0]); e.rec = Math.min(e.rec, 60); }
        g.esercizi.push(e);
      });
    });
    return p;
  }

  /* ---------------- calendario: settimane con progressione e scarichi ---------------- */
  function isScarico(p, w) { return p.scarico > 0 && p.settimane > p.scarico && (w + 1) % p.scarico === 0 && w + 1 < p.settimane; }
  function faseBlocchi(p, w) {
    var n = p.settimane, a = Math.max(1, Math.round(n * 0.4)), t = Math.max(1, Math.round(n * 0.35));
    return w < a ? 'accumulo' : w < a + t ? 'trasformazione' : 'realizzazione';
  }
  var FASI = { accumulo: 'Accumulo', trasformazione: 'Trasformazione', realizzazione: 'Realizzazione' };
  function dataSeduta(p, w, wd) {
    var d0 = new Date(p.inizio + 'T12:00:00');
    if (isNaN(d0)) d0 = new Date();
    var start = new Date(d0.getTime() + w * 7 * DAY);
    var cur = (start.getDay() + 6) % 7 + 1, delta = (wd - cur + 7) % 7;
    return new Date(start.getTime() + delta * DAY).toISOString().slice(0, 10);
  }
  function prescrizione(p, e, w, gi, prog) {
    var O = OBIETTIVI[p.obiettivo], sc = isScarico(p, w);
    // settimane effettive di progressione (gli scarichi non contano)
    var eff = 0;
    for (var i = 0; i < w; i++) if (!isScarico(p, i)) eff++;
    var serie = e.serie, rmin = e.ripMin, rmax = e.ripMax, sec = e.sec, pct = e.pct, rir = e.rir, fase = null;
    var kgBase = e.kg != null ? e.kg : null;
    if (kgBase == null && pct != null && prog && prog.rm) kgBase = prog.rm * pct / 100; // dal massimale stimato
    var kmult = Math.pow(1 + O.inc, eff), ripAdd = 0, secAdd = 0;
    if (p.modello === 'ondulata') {
      var k = gi % 3; // pesante / medio / leggero
      if (k === 0 && rmin != null) { rmin = Math.max(1, rmin - 2); rmax = Math.max(rmin, rmax - 2); kmult *= 1.05; }
      if (k === 2 && rmin != null) { rmin += 2; rmax += 2; kmult *= 0.92; }
    }
    if (p.modello === 'blocchi') {
      fase = faseBlocchi(p, w);
      if (fase === 'accumulo') { serie += 1; if (rmin != null) { rmin += 2; rmax += 2; } kmult *= 0.92; }
      if (fase === 'realizzazione') { serie = Math.max(1, serie - 1); if (rmin != null) { rmin = Math.max(1, rmin - 2); rmax = Math.max(rmin, rmax - 2); } kmult *= 1.06; rir = Math.max(0, rir - 1); }
    }
    // senza carico: si progredisce con ripetizioni (fino al massimo dell'intervallo) o con il tempo
    if (kgBase == null && rmin != null) ripAdd = Math.min(eff, Math.max(0, O.rip[1] + 5 - rmax));
    if (sec != null) secAdd = Math.min(eff * 5, sec);
    var kg = kgBase != null ? roundKg(kgBase * kmult) : null;
    if (sc) { serie = Math.max(1, Math.round(serie * 0.6)); if (kg != null) kg = roundKg(kg * 0.9); rir = Math.min(5, rir + 2); ripAdd = Math.max(0, ripAdd - 2); secAdd = Math.max(0, secAdd - 10); }
    return {
      id: e.id, k: e.k, nome: e.nome, gruppi: e.gruppi, unita: e.unita, serie: serie,
      ripMin: rmin != null ? rmin + ripAdd : null, ripMax: rmax != null ? rmax + ripAdd : null, sec: sec != null ? sec + secAdd : null,
      kg: kg, pct: kgBase == null ? pct : null, rec: e.rec, rir: rir, note: e.note, fase: fase
    };
  }
  function calendario(p, progressi) {
    progressi = progressi || {};
    var out = [];
    for (var w = 0; w < p.settimane; w++) {
      var sc = isScarico(p, w), fase = p.modello === 'blocchi' ? faseBlocchi(p, w) : null;
      out.push({
        n: w + 1, scarico: sc, fase: sc ? 'Scarico' : fase ? FASI[fase] : 'Carico',
        giorni: p.giorni.map(function (g, gi) {
          return { id: g.id, nome: g.nome, wd: g.wd, data: dataSeduta(p, w, g.wd), fatta: p.fatte.some(function (f) { return f.w === w && f.g === g.id; }),
            esercizi: g.esercizi.map(function (e) { return prescrizione(p, e, w, gi, progressi[e.k]); }) };
        })
      });
    }
    return out;
  }
  function prossima(p) {
    var cal = calendario(p);
    for (var w = 0; w < cal.length; w++) for (var i = 0; i < cal[w].giorni.length; i++) if (!cal[w].giorni[i].fatta) return { w: w, i: i, g: cal[w].giorni[i], s: cal[w] };
    return null;
  }

  /* ---------------- stime ---------------- */
  function secLavoro(x) { return x.unita === 'sec' ? x.sec : (x.ripMax || x.ripMin || 10) * (x.unita === 'm' ? 0.4 : 3.5); }
  function durataSeduta(esercizi) {
    var s = 8 * 60; // riscaldamento
    esercizi.forEach(function (x) { s += x.serie * secLavoro(x) + Math.max(0, x.serie - 1) * x.rec + 60; });
    return Math.round(s / 60);
  }
  function volumeSettimanale(p) {
    var v = {};
    MUSCOLARI.forEach(function (g) { v[g] = 0; });
    p.giorni.forEach(function (g) {
      g.esercizi.forEach(function (e) {
        (e.gruppi || []).forEach(function (gr, i) { if (v[gr] != null) v[gr] += e.serie * (i === 0 ? 1 : 0.5); }); // secondari a metà
      });
    });
    return v;
  }
  function frequenza(p) {
    var f = {};
    MUSCOLARI.forEach(function (g) { f[g] = 0; });
    p.giorni.forEach(function (g) {
      var seen = {};
      g.esercizi.forEach(function (e) { var gr = (e.gruppi || [])[0]; if (gr && f[gr] != null && !seen[gr]) { seen[gr] = 1; f[gr]++; } });
    });
    return f;
  }
  function stima1RM(kg, rip) { return kg && rip ? kg * (1 + Math.min(rip, 15) / 30) : null; } // Epley

  /* ---------------- controllo delle regole ---------------- */
  function controlla(p) {
    var O = OBIETTIVI[p.obiettivo], iss = [];
    var add = function (level, area, msg) { iss.push({ level: level, area: area, msg: msg }); };
    var nG = p.giorni.length;
    if (!nG) { add('error', 'Struttura', 'Aggiungi almeno un giorno di allenamento.'); return iss; }
    var wds = p.giorni.map(function (g) { return g.wd; });
    if (new Set(wds).size !== wds.length) add('error', 'Struttura', 'Due giorni del programma cadono nello stesso giorno della settimana.');
    if (nG >= 7) add('warn', 'Recupero', 'Nessun giorno di riposo: serve almeno un giorno libero a settimana per recuperare.');
    if (p.livello === 1 && nG > 4) add('warn', 'Livello', 'Per un principiante 2–4 sedute a settimana bastano e permettono di recuperare (ACSM).');
    p.giorni.forEach(function (g) {
      if (!g.esercizi.length) add('error', g.nome, 'Il giorno non ha esercizi.');
      if (g.esercizi.length > 10) add('warn', g.nome, g.esercizi.length + ' esercizi sono tanti per una seduta: la qualità cala dopo i primi 6–8.');
      var d = durataSeduta(g.esercizi);
      if (d > 90) add('warn', g.nome, 'Durata stimata ' + d + '\': oltre i 90 minuti la qualità del lavoro e il recupero ne risentono.');
      // ordine: core e mobilità alla fine, prima i multiarticolari
      var firstCore = g.esercizi.findIndex(function (e) { return (e.gruppi || [])[0] === 'core'; });
      if (firstCore >= 0 && g.esercizi.slice(firstCore + 1).some(function (e) { var gr = (e.gruppi || [])[0]; return gr && gr !== 'core' && gr !== 'cardio'; }))
        add('info', g.nome, 'Metti il core alla fine: affaticare prima gli stabilizzatori peggiora la tecnica negli esercizi principali (NSCA).');
      g.esercizi.forEach(function (e) {
        var lab = g.nome + ' · ' + e.nome;
        var R = !e.carico && O.ripCL ? [O.rip[0], O.ripCL[1]] : O.rip;
        if (e.unita === 'rip' && e.ripMin != null && (e.gruppi || [])[0] !== 'core') {
          if (e.ripMax < R[0] - 1 || e.ripMin > R[1] + 3) add('warn', lab, e.ripMin + '–' + e.ripMax + ' ripetizioni sono lontane dall\'intervallo per ' + O.n.toLowerCase() + ' (' + R[0] + '–' + R[1] + ').');
        }
        if ((e.gruppi || [])[0] !== 'core' && (e.serie < O.serie[0] - 1 || e.serie > O.serie[1] + 1)) add('info', lab, e.serie + ' serie: per ' + O.n.toLowerCase() + ' si consigliano ' + O.serie[0] + '–' + O.serie[1] + ' serie per esercizio.');
        if ((e.gruppi || [])[0] !== 'core' && (e.rec < O.rec[0] * 0.6 || e.rec > O.rec[1] * 1.5)) add('info', lab, 'Recupero di ' + e.rec + '": per ' + O.n.toLowerCase() + ' l\'intervallo indicato è ' + O.rec[0] + '–' + O.rec[1] + '".');
        if (e.pct != null && e.kg == null && (e.pct < O.pct[0] - 10 || e.pct > O.pct[1] + 5)) add('info', lab, e.pct + '% del massimale: per ' + O.n.toLowerCase() + ' si usa il ' + O.pct[0] + '–' + O.pct[1] + '%.');
        if (p.obiettivo === 'potenza' && e.rir < 2) add('info', lab, 'Nella potenza si resta lontani dal cedimento (2+ ripetizioni in riserva) per mantenere la velocità.');
      });
    });
    // volume settimanale per gruppo muscolare
    var v = volumeSettimanale(p), f = frequenza(p);
    MUSCOLARI.forEach(function (gr) {
      var x = v[gr], lab = 'Volume · ' + GRUPPI[gr];
      if (gr === 'core') { if (x === 0) add('info', lab, 'Nessun esercizio per il core: 2–6 serie a settimana bastano per la stabilità.'); return; }
      if (x === 0) add('warn', lab, 'Gruppo non allenato: un programma completo lavora tutti i grandi gruppi muscolari (ACSM).');
      else if (x < O.vol[0] * (p.livello === 1 ? 0.6 : 1) - 0.01) add('info', lab, fmtN(x) + ' serie a settimana: sotto le ' + O.vol[0] + '–' + O.vol[1] + ' consigliate per ' + O.n.toLowerCase() + '.');
      else if (x > O.vol[1] + (p.livello === 3 ? 6 : 2)) add('warn', lab, fmtN(x) + ' serie a settimana: oltre il volume che si recupera bene (' + O.vol[0] + '–' + O.vol[1] + ').');
      if (x >= 10 && f[gr] === 1) add('info', lab, 'Tutto il volume in un solo giorno: distribuirlo su 2 sedute a settimana dà risultati uguali o migliori (Schoenfeld 2016).');
    });
    // recupero di 48 ore sullo stesso gruppo con lavoro pesante
    var byWd = p.giorni.slice().sort(function (a, b) { return a.wd - b.wd; });
    var heavy = function (g) {
      var s = {};
      g.esercizi.forEach(function (e) { var gr = (e.gruppi || [])[0]; if (gr && gr !== 'core' && gr !== 'cardio' && (e.rir <= 1 || (e.ripMax != null && e.ripMax <= 6) || e.serie >= 4)) s[gr] = 1; });
      return s;
    };
    for (var i = 0; i < byWd.length; i++) {
      var a = byWd[i], b = byWd[(i + 1) % byWd.length], gap = ((b.wd - a.wd) + 7) % 7 || 7;
      if (byWd.length > 1 && gap === 1) {
        var ha = heavy(a), hb = heavy(b);
        var both = Object.keys(ha).filter(function (k) { return hb[k]; });
        if (both.length) add('warn', 'Recupero', a.nome + ' e ' + b.nome + ' sono a 24 ore e caricano gli stessi gruppi (' + both.map(function (k) { return GRUPPI[k].toLowerCase(); }).join(', ') + '): servono circa 48 ore tra sedute intense sullo stesso muscolo.');
      }
    }
    // equilibrio spinta / trazione
    var spinta = v.petto + v.spalle * 0.5, trazione = v.dorso;
    if (spinta > 0 && trazione > 0 && spinta / trazione > 1.6) add('warn', 'Equilibrio', 'Molta più spinta che trazione: per la salute delle spalle aumenta il lavoro per il dorso (rapporto vicino a 1:1).');
    if (spinta === 0 && trazione > 0 || trazione === 0 && spinta > 0) add('info', 'Equilibrio', 'Manca ' + (trazione === 0 ? 'la trazione (dorso)' : 'la spinta (petto e spalle)') + ' nel programma.');
    // periodizzazione
    if (p.settimane > 6 && !p.scarico) add('warn', 'Periodizzazione', 'Oltre 6 settimane senza scarico: una settimana più leggera ogni 4–6 favorisce il recupero e i progressi.');
    if (p.scarico && p.scarico < 3) add('info', 'Periodizzazione', 'Scarico ogni ' + p.scarico + ' settimane: troppo frequente per accumulare adattamenti; di solito ogni 4–6.');
    if (p.settimane < 4) add('info', 'Periodizzazione', 'Programmi di almeno 4–6 settimane permettono di misurare i progressi.');
    if (!iss.some(function (x) { return x.level !== 'info'; })) add('ok', 'Controllo', 'Il programma rispetta le regole principali di frequenza, volume, recupero e progressione per ' + O.n.toLowerCase() + '.');
    return iss;
  }

  /* ---------------- testi ---------------- */
  function presTxt(x) {
    var a = x.serie + ' × ' + (x.unita === 'sec' ? x.sec + '"' : (x.ripMin === x.ripMax ? x.ripMin : x.ripMin + '–' + x.ripMax) + (x.unita === 'm' ? ' m' : x.unita === 'cal' ? ' cal' : ''));
    if (x.kg != null) a += ' @ ' + fmtN(x.kg) + ' kg'; else if (x.pct != null) a += ' @ ' + x.pct + '% 1RM';
    return a + ' · rec ' + x.rec + '" · RIR ' + x.rir;
  }
  function dataIt(iso) { var d = new Date(iso + 'T12:00:00'); return d.toLocaleDateString ? d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }) : iso; }
  function testata(p) {
    var O = OBIETTIVI[p.obiettivo];
    return [p.nome, 'Obiettivo: ' + O.n + ' · Livello: ' + LIVELLI[p.livello] + ' · ' + p.settimane + ' settimane (' + (Math.round(p.settimane / 4.345 * 10) / 10) + ' mesi)',
      'Inizio: ' + p.inizio + ' · Giorni: ' + p.giorni.map(function (g) { return WDS[g.wd]; }).join(', ') + ' · Progressione: ' + MODELLI[p.modello].n + (p.scarico ? ' · scarico ogni ' + p.scarico + ' settimane' : '')];
  }

  /* ---------------- esportazioni ---------------- */
  function toJSON(p, progressi) {
    return JSON.stringify({ formato: 'hift-programma', versione: 1, esportato: new Date().toISOString(), programma: p, calendario: calendario(p, progressi) }, null, 2);
  }
  function fromJSON(text) {
    var o = JSON.parse(text);
    var raw = o && o.formato === 'hift-programma' ? o.programma : o;
    if (!raw || !Array.isArray(raw.giorni)) throw new Error('Il file non contiene un programma HIFT.');
    var p = pulisci(raw); p.id = uid(); p.fatte = []; return p;
  }
  var COLS = ['Settimana', 'Fase', 'Data', 'Giorno', 'Seduta', 'Ordine', 'Esercizio', 'Gruppo', 'Serie', 'Ripetizioni', 'Tempo (s)', 'Carico (kg)', '% 1RM', 'Recupero (s)', 'RIR', 'Note'];
  function righe(p, progressi) {
    var R = [];
    calendario(p, progressi).forEach(function (s) {
      s.giorni.forEach(function (g) {
        g.esercizi.forEach(function (x, i) {
          R.push([s.n, s.fase, g.data, WD[g.wd], g.nome, i + 1, x.nome, (x.gruppi || []).map(function (k) { return GRUPPI[k]; }).join(' + '), x.serie,
            x.unita === 'sec' ? '' : x.ripMin === x.ripMax ? x.ripMin : x.ripMin + '-' + x.ripMax, x.unita === 'sec' ? x.sec : '',
            x.kg != null ? x.kg : '', x.pct != null ? x.pct : '', x.rec, x.rir, x.note || '']);
        });
      });
    });
    return R;
  }
  function toCSV(p, progressi) {
    var q = function (v) { v = String(v == null ? '' : v); return /[";\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var cell = function (v) { return typeof v === 'number' ? String(v).replace('.', ',') : q(v); };
    return '\ufeff' + [COLS].concat(righe(p, progressi)).map(function (r) { return r.map(cell).join(';'); }).join('\r\n') + '\r\n';
  }
  function xmlEsc(s) { return String(s == null ? '' : s).replace(/[<>&"]/g, function (c) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]; }); }
  function toXLS(p, progressi) { // SpreadsheetML 2003: si apre con Excel, LibreOffice e Numbers
    var row = function (r, st) { return '<Row>' + r.map(function (v) { return '<Cell' + (st ? ' ss:StyleID="h"' : '') + '><Data ss:Type="' + (typeof v === 'number' ? 'Number' : 'String') + '">' + xmlEsc(v) + '</Data></Cell>'; }).join('') + '</Row>'; };
    var info = testata(p).map(function (t) { return row([t]); }).join('');
    return '<?xml version="1.0" encoding="UTF-8"?>\n<?mso-application progid="Excel.Sheet"?>\n' +
      '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">' +
      '<Styles><Style ss:ID="h"><Font ss:Bold="1"/><Interior ss:Color="#D4FF1E" ss:Pattern="Solid"/></Style></Styles>' +
      '<Worksheet ss:Name="Programma"><Table>' + row(COLS, true) + righe(p, progressi).map(function (r) { return row(r); }).join('') + '</Table></Worksheet>' +
      '<Worksheet ss:Name="Info"><Table>' + info + '</Table></Worksheet></Workbook>';
  }
  function icsEsc(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  function fold(line) { // righe al massimo di 75 ottetti (RFC 5545)
    var out = [], cur = '', bytes = 0;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i], b = unescape(encodeURIComponent(ch)).length;
      if (bytes + b > (out.length ? 74 : 75)) { out.push(cur); cur = ''; bytes = 0; }
      cur += ch; bytes += b;
    }
    out.push(cur);
    return out.join('\r\n ');
  }
  function toICS(p, progressi) {
    var now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    var hm = /^(\d{1,2}):(\d{2})$/.exec(p.ora || '18:00') || [0, '18', '00'];
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Hift App//Programma//IT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:' + icsEsc(p.nome)];
    calendario(p, progressi).forEach(function (s) {
      s.giorni.forEach(function (g) {
        var dur = durataSeduta(g.esercizi);
        var st = new Date(g.data + 'T' + String(hm[1]).padStart(2, '0') + ':' + hm[2] + ':00'), en = new Date(st.getTime() + dur * 60000);
        var t = function (x) { return x.getFullYear() + String(x.getMonth() + 1).padStart(2, '0') + String(x.getDate()).padStart(2, '0') + 'T' + String(x.getHours()).padStart(2, '0') + String(x.getMinutes()).padStart(2, '0') + '00'; };
        L.push('BEGIN:VEVENT', 'UID:' + p.id + '-' + s.n + '-' + g.id + '@hift.app', 'DTSTAMP:' + now, 'DTSTART:' + t(st), 'DTEND:' + t(en),
          fold('SUMMARY:' + icsEsc(p.nome + ' · ' + g.nome + ' · sett. ' + s.n + (s.scarico ? ' (scarico)' : ''))),
          fold('DESCRIPTION:' + icsEsc(s.fase + ' · durata stimata ' + dur + ' min\n' + g.esercizi.map(function (x, i) { return (i + 1) + '. ' + x.nome + ': ' + presTxt(x); }).join('\n'))),
          'END:VEVENT');
      });
    });
    L.push('END:VCALENDAR');
    return L.join('\r\n') + '\r\n';
  }
  function toText(p, progressi, md) {
    var O = OBIETTIVI[p.obiettivo], out = [];
    var h = testata(p);
    out.push(md ? '# ' + h[0] : h[0].toUpperCase(), '', md ? '**' + h[1] + '**  ' : h[1], h[2], '', (md ? '> ' : '') + O.fonte, '');
    calendario(p, progressi).forEach(function (s) {
      out.push(md ? '## Settimana ' + s.n + ' · ' + s.fase : '=== SETTIMANA ' + s.n + ' · ' + s.fase.toUpperCase() + ' ===', '');
      s.giorni.forEach(function (g) {
        out.push(md ? '### ' + WD[g.wd] + ' ' + g.data + ' · ' + g.nome + ' (~' + durataSeduta(g.esercizi) + ' min)' : WD[g.wd] + ' ' + g.data + ' · ' + g.nome + ' (~' + durataSeduta(g.esercizi) + ' min)');
        if (md) out.push('', '| # | Esercizio | Prescrizione |', '|---|---|---|');
        g.esercizi.forEach(function (x, i) { out.push(md ? '| ' + (i + 1) + ' | ' + x.nome.replace(/\|/g, '/') + ' | ' + presTxt(x) + ' |' : '  ' + (i + 1) + '. ' + x.nome + ' — ' + presTxt(x)); });
        out.push('');
      });
    });
    out.push((md ? '_' : '') + 'Generato con Hift App. Riscaldamento di 8–10 minuti prima di ogni seduta. RIR = ripetizioni in riserva a fine serie.' + (md ? '_' : ''));
    return out.join('\n') + '\n';
  }
  function toHTML(p, progressi) {
    var O = OBIETTIVI[p.obiettivo], h = testata(p);
    var cal = calendario(p, progressi);
    return '<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + xmlEsc(p.nome) + '</title>' +
      '<style>body{font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111;margin:24px;max-width:960px}h1{font-size:28px;margin:0 0 4px}h2{font-size:18px;margin:28px 0 8px;padding:6px 10px;background:#D4FF1E}h2.s{background:#cde8f5}h3{font-size:15px;margin:16px 0 6px}' +
      'table{border-collapse:collapse;width:100%;margin-bottom:8px}td,th{border:1px solid #ccc;padding:5px 8px;text-align:left;vertical-align:top}th{background:#f2f2f2}.m{color:#555}.f{font-size:12px;color:#555;border-left:3px solid #D4FF1E;padding-left:10px}' +
      '@media print{body{margin:10mm}h2{break-after:avoid}table{break-inside:avoid}}</style></head><body>' +
      '<h1>' + xmlEsc(h[0]) + '</h1><div class="m">' + xmlEsc(h[1]) + '<br>' + xmlEsc(h[2]) + '</div><p class="f">' + xmlEsc(O.fonte) + '</p>' +
      cal.map(function (s) {
        return '<h2' + (s.scarico ? ' class="s"' : '') + '>Settimana ' + s.n + ' · ' + xmlEsc(s.fase) + '</h2>' + s.giorni.map(function (g) {
          return '<h3>' + WD[g.wd] + ' ' + xmlEsc(dataIt(g.data)) + ' · ' + xmlEsc(g.nome) + ' <span class="m">(~' + durataSeduta(g.esercizi) + ' min)</span></h3><table><tr><th>#</th><th>Esercizio</th><th>Serie</th><th>Rip / tempo</th><th>Carico</th><th>Recupero</th><th>RIR</th><th>Fatto</th></tr>' +
            g.esercizi.map(function (x, i) {
              return '<tr><td>' + (i + 1) + '</td><td>' + xmlEsc(x.nome) + (x.note ? '<br><span class="m">' + xmlEsc(x.note) + '</span>' : '') + '</td><td>' + x.serie + '</td><td>' + (x.unita === 'sec' ? x.sec + '"' : x.ripMin === x.ripMax ? x.ripMin : x.ripMin + '–' + x.ripMax) +
                '</td><td>' + (x.kg != null ? fmtN(x.kg) + ' kg' : x.pct != null ? x.pct + '% 1RM' : '—') + '</td><td>' + x.rec + '"</td><td>' + x.rir + '</td><td>☐</td></tr>';
            }).join('') + '</table>';
        }).join('');
      }).join('') + '<p class="m">Generato con Hift App · RIR = ripetizioni in riserva · riscaldamento di 8–10 minuti prima di ogni seduta.</p></body></html>';
  }

  return {
    OBIETTIVI: OBIETTIVI, MODELLI: MODELLI, GRUPPI: GRUPPI, MUSCOLARI: MUSCOLARI, WD: WD, WDS: WDS, LIVELLI: LIVELLI,
    gruppiDaTesto: gruppiDaTesto, vuoto: vuoto, nuovoGiorno: nuovoGiorno, nuovoEsercizio: nuovoEsercizio, pulisci: pulisci, proposta: proposta,
    calendario: calendario, prossima: prossima, isScarico: isScarico, dataSeduta: dataSeduta, durataSeduta: durataSeduta,
    volumeSettimanale: volumeSettimanale, frequenza: frequenza, stima1RM: stima1RM, controlla: controlla, presTxt: presTxt,
    toJSON: toJSON, fromJSON: fromJSON, toCSV: toCSV, toXLS: toXLS, toICS: toICS, toText: function (p, pr) { return toText(p, pr, false); },
    toMarkdown: function (p, pr) { return toText(p, pr, true); }, toHTML: toHTML, roundKg: roundKg, fmtN: fmtN
  };
});
