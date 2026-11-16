/* =========================================================
   analisi-core.js — attività e analisi (nessun DOM)
   - discipline: WOD, HIFT Method, programmi + corsa, camminata, bicicletta,
     nuoto, stretching, pilates, yoga
   - MET dal Compendium of Physical Activities (Ainsworth 2011 / Herrmann 2024):
     valori di riferimento, la stima è indicativa
   - calorie = MET × peso (kg) × ore; MET-minuti; minuti "moderati
     equivalenti" per l'obiettivo OMS 2020 (150–300 min/settimana)
   - aggregazioni per settimana, mese, disciplina e famiglia
   Usabile nel browser (window.HiftAnalisi) e in Node.
   ========================================================= */
(function (root, factory) {
  var m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else root.HiftAnalisi = m;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var DAY = 864e5;

  /* famiglie (ordine fisso = ordine dei colori nei grafici) */
  var FAM = [
    { k: 'funz', n: 'Allenamento funzionale' }, { k: 'corsa', n: 'Corsa' }, { k: 'camminata', n: 'Camminata' },
    { k: 'bici', n: 'Bicicletta' }, { k: 'nuoto', n: 'Nuoto' }, { k: 'mente', n: 'Mente e corpo' }
  ];
  var DISC = {
    wod: { n: 'WOD', fam: 'funz' }, hift: { n: 'HIFT Method', fam: 'funz' }, programma: { n: 'Programmi', fam: 'funz' }, libero: { n: 'Allenamento libero', fam: 'funz' },
    corsa: { n: 'Corsa', fam: 'corsa', dist: 'km', att: 1 }, camminata: { n: 'Camminata', fam: 'camminata', dist: 'km', att: 1 },
    bici: { n: 'Bicicletta', fam: 'bici', dist: 'km', att: 1 }, nuoto: { n: 'Nuoto', fam: 'nuoto', dist: 'm', att: 1 },
    stretching: { n: 'Stretching', fam: 'mente', att: 1 }, pilates: { n: 'Pilates', fam: 'mente', att: 1 }, yoga: { n: 'Yoga', fam: 'mente', att: 1 }
  };
  var ATTIVITA = Object.keys(DISC).filter(function (k) { return DISC[k].att; });
  var INT = { leggera: 'Leggera', moderata: 'Moderata', vigorosa: 'Vigorosa' };
  var STILI = { libero: 'Stile libero', dorso: 'Dorso', rana: 'Rana', farfalla: 'Farfalla', misto: 'Misto / libero' };
  var YOGA = { dolce: 'Dolce / restorative', hatha: 'Hatha', vinyasa: 'Vinyasa / power' };

  /* tabelle MET: [velocità km/h, MET] — interpolazione lineare */
  var T = {
    corsa: [[6.4, 6.0], [8.0, 8.3], [8.4, 9.0], [9.7, 9.8], [10.8, 10.5], [11.3, 11.0], [12.1, 11.8], [12.9, 12.3], [13.8, 12.8], [14.5, 14.5], [16.1, 16.0], [17.7, 19.0], [19.3, 19.8]],
    camminata: [[3.2, 2.8], [4.0, 3.0], [4.8, 3.5], [5.6, 4.3], [6.4, 5.0], [7.2, 7.0], [8.0, 8.3]],
    bici: [[12, 4.0], [17.5, 6.8], [20.5, 8.0], [24, 10.0], [28, 12.0], [33, 15.8]]
  };
  var BY_INT = {
    corsa: { leggera: 7.0, moderata: 9.8, vigorosa: 11.5 }, camminata: { leggera: 2.8, moderata: 3.5, vigorosa: 5.0 },
    bici: { leggera: 4.0, moderata: 6.8, vigorosa: 10.0 }, stretching: { leggera: 2.3, moderata: 2.3, vigorosa: 2.8 },
    pilates: { leggera: 2.8, moderata: 3.0, vigorosa: 3.8 }
  };
  var NUOTO = { libero: [5.8, 8.3, 9.8], dorso: [4.8, 6.5, 9.5], rana: [5.3, 7.5, 10.3], farfalla: [13.8, 13.8, 13.8], misto: [6.0, 7.0, 9.8] };
  var YOGA_MET = { dolce: 2.0, hatha: 2.5, vinyasa: 4.0 };
  var lerpT = function (tab, v) {
    if (v <= tab[0][0]) return tab[0][1] * Math.max(0.6, v / tab[0][0]);
    for (var i = 1; i < tab.length; i++) if (v <= tab[i][0]) { var a = tab[i - 1], b = tab[i]; return a[1] + (b[1] - a[1]) * (v - a[0]) / (b[0] - a[0]); }
    return tab[tab.length - 1][1];
  };
  function intDaRpe(rpe) { return rpe == null ? 'moderata' : rpe <= 4 ? 'leggera' : rpe <= 6 ? 'moderata' : 'vigorosa'; }
  var II = { leggera: 0, moderata: 1, vigorosa: 2 };

  function disciplina(h) {
    if (h.att && DISC[h.att]) return h.att;
    if (h.fmt === 'HIFT') return 'hift';
    if (h.fmt === 'PROGRAMMA') return 'programma';
    if (h.fmt === 'LIBERO') return 'libero';
    return 'wod';
  }
  function velocita(h) {
    var d = DISC[disciplina(h)];
    if (!d || !d.dist || !h.dist || !h.min) return null;
    return d.dist === 'km' ? h.dist / (h.min / 60) : (h.dist / 1000) / (h.min / 60);
  }
  /* MET della sessione e da cosa è stato ricavato */
  function met(h) {
    var k = disciplina(h), int = INT[h.intensita] ? h.intensita : intDaRpe(h.rpe), v = velocita(h);
    if (k === 'wod' || k === 'hift') return { met: h.rpe == null ? 6.0 : h.rpe <= 5 ? 4.3 : h.rpe <= 7 ? 6.0 : 8.0, base: 'circuit training, sforzo da RPE' };
    if (k === 'programma' || k === 'libero') return { met: h.rpe == null ? 5.0 : h.rpe <= 5 ? 3.5 : h.rpe <= 7 ? 5.0 : 6.0, base: 'allenamento con i pesi, sforzo da RPE' };
    if (T[k] && v && v > 0.5) return { met: Math.round(lerpT(T[k], v) * 10) / 10, base: 'velocità ' + (Math.round(v * 10) / 10) + ' km/h' };
    if (k === 'nuoto') { var st = NUOTO[h.stile] ? h.stile : 'misto'; return { met: NUOTO[st][II[int]], base: STILI[st].toLowerCase() + ', intensità ' + int }; }
    if (k === 'yoga') { var y = YOGA_MET[h.yoga] != null ? h.yoga : int === 'leggera' ? 'dolce' : int === 'vigorosa' ? 'vinyasa' : 'hatha'; return { met: YOGA_MET[y], base: 'yoga ' + YOGA[y].toLowerCase() }; }
    return { met: BY_INT[k][int], base: 'intensità ' + int };
  }
  function arricchisci(h, peso) {
    var k = disciplina(h), m = met(h), min = Math.max(0, +h.min || 0), kg = +peso || 70;
    return {
      date: h.date, t: new Date(h.date).getTime(), disc: k, fam: DISC[k].fam, min: min, met: m.met, base: m.base,
      kcal: Math.round(m.met * kg * min / 60), metmin: Math.round(m.met * min),
      modEq: m.met >= 6 ? 2 * min : m.met >= 3 ? min : 0, forza: DISC[k].fam === 'funz', dist: h.dist || null, kmh: velocita(h), rpe: h.rpe, ref: h
    };
  }
  function lunedi(t) { var d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.getTime(); }
  function vuotoFam() { var o = {}; FAM.forEach(function (f) { o[f.k] = 0; }); return o; }

  /* analisi su un periodo: settimane (o mesi se lungo), totali per disciplina e famiglia */
  function analizza(hist, peso, opt) {
    opt = opt || {};
    var now = opt.now || Date.now(), sett = opt.settimane || 12;
    var E = (hist || []).map(function (h) { return arricchisci(h, peso); }).filter(function (e) { return isFinite(e.t); });
    var start = sett === Infinity ? (E.length ? lunedi(Math.min.apply(null, E.map(function (e) { return e.t; }))) : lunedi(now)) : lunedi(now) - (sett - 1) * 7 * DAY;
    var P = E.filter(function (e) { return e.t >= start && e.t <= now + DAY; });
    var mesi = (now - start) / DAY > 7 * 27;
    var buckets = [];
    if (mesi) {
      var d0 = new Date(start); d0.setDate(1); d0.setHours(0, 0, 0, 0);
      var cur = new Date(now);
      for (var y = d0.getFullYear(), mo = d0.getMonth(); y < cur.getFullYear() || (y === cur.getFullYear() && mo <= cur.getMonth()); mo++) {
        if (mo > 11) { mo = 0; y++; }
        var a = new Date(y, mo, 1).getTime(), b = new Date(y, mo + 1, 1).getTime();
        buckets.push({ a: a, b: b, lab: new Date(a).toLocaleDateString('it-IT', { month: 'short' }), full: new Date(a).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }) });
        if (y === cur.getFullYear() && mo === cur.getMonth()) break;
      }
    } else {
      for (var t = start; t <= now; t += 7 * DAY) buckets.push({ a: t, b: t + 7 * DAY, lab: new Date(t).toLocaleDateString('it-IT', { day: 'numeric', month: 'numeric' }), full: 'Settimana del ' + new Date(t).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' }) });
    }
    buckets.forEach(function (bk) {
      bk.fam = vuotoFam(); bk.min = 0; bk.kcal = 0; bk.n = 0;
      P.forEach(function (e) { if (e.t >= bk.a && e.t < bk.b) { bk.fam[e.fam] += e.min; bk.min += e.min; bk.kcal += e.kcal; bk.n++; } });
    });
    var perDisc = {};
    Object.keys(DISC).forEach(function (k) { perDisc[k] = { k: k, n: DISC[k].n, fam: DISC[k].fam, min: 0, sessioni: 0, kcal: 0, metmin: 0, dist: 0 }; });
    P.forEach(function (e) { var x = perDisc[e.disc]; x.min += e.min; x.sessioni++; x.kcal += e.kcal; x.metmin += e.metmin; if (e.dist) x.dist += e.dist; });
    var tot = P.reduce(function (a, e) { a.min += e.min; a.sessioni++; a.kcal += e.kcal; a.metmin += e.metmin; return a; }, { min: 0, sessioni: 0, kcal: 0, metmin: 0 });
    var nW = Math.max(1, Math.round((Math.min(now, buckets.length ? buckets[buckets.length - 1].b : now) - start) / (7 * DAY)));
    tot.mediaSett = Math.round(tot.min / nW);
    return { mesi: mesi, buckets: buckets, perDisc: Object.keys(perDisc).map(function (k) { return perDisc[k]; }), tot: tot, entries: P, start: start };
  }
  /* settimana corrente rispetto alle raccomandazioni OMS 2020 */
  function oms(hist, peso, now) {
    now = now || Date.now();
    var a = lunedi(now), E = (hist || []).map(function (h) { return arricchisci(h, peso); }).filter(function (e) { return e.t >= a && e.t < a + 7 * DAY; });
    var giorniForza = new Set(E.filter(function (e) { return e.forza; }).map(function (e) { return new Date(e.t).toDateString(); })).size;
    var mod = E.reduce(function (s, e) { return s + e.modEq; }, 0);
    return { modEq: mod, min150: Math.min(1, mod / 150), min300: Math.min(1, mod / 300), giorniForza: giorniForza, ok: mod >= 150 && giorniForza >= 2 };
  }
  function passo(kmh) { if (!kmh) return ''; var s = Math.round(3600 / kmh), m = Math.floor(s / 60); return m + '\'' + String(s % 60).padStart(2, '0') + '"/km'; }
  function voce(o) { // nuova attività per il Diario
    var k = DISC[o.att] && DISC[o.att].att ? o.att : 'corsa';
    var min = Math.max(1, Math.min(1440, Math.round(+o.min || 0)));
    var dist = o.dist == null || o.dist === '' ? null : Math.max(0, Math.min(k === 'nuoto' ? 20000 : 500, +String(o.dist).replace(',', '.')));
    var h = { date: o.date || new Date().toISOString(), title: o.title || DISC[k].n, min: min, rpe: o.rpe ? Math.max(1, Math.min(10, +o.rpe)) : null, note: String(o.note || '').slice(0, 300),
      fmt: 'ATTIVITA', fmtLabel: DISC[k].n, ids: [], att: k, dist: dist || null, intensita: INT[o.intensita] ? o.intensita : null,
      stile: k === 'nuoto' && STILI[o.stile] ? o.stile : null, yoga: k === 'yoga' && YOGA[o.yoga] ? o.yoga : null, fc: o.fc ? Math.max(40, Math.min(230, Math.round(+o.fc))) : null };
    var e = arricchisci(h, o.peso);
    var parts = [];
    if (h.dist) parts.push(DISC[k].dist === 'km' ? String(Math.round(h.dist * 100) / 100).replace('.', ',') + ' km' : Math.round(h.dist) + ' m');
    if (e.kmh && (k === 'corsa' || k === 'camminata')) parts.push(passo(e.kmh)); else if (e.kmh && k === 'bici') parts.push(String(Math.round(e.kmh * 10) / 10).replace('.', ',') + ' km/h');
    if (h.fc) parts.push('FC ' + h.fc);
    parts.push('~' + e.kcal + ' kcal');
    h.res = parts.join(' · ');
    if (!o.title && h.dist) h.title = DISC[k].n + ' · ' + parts[0];
    return h;
  }
  return { FAM: FAM, DISC: DISC, ATTIVITA: ATTIVITA, INT: INT, STILI: STILI, YOGA: YOGA, disciplina: disciplina, met: met, velocita: velocita,
    arricchisci: arricchisci, analizza: analizza, oms: oms, passo: passo, voce: voce, lunedi: lunedi };
});
