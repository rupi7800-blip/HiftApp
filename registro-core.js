/* =========================================================
   registro-core.js — registro dell'allenamento serie per serie (nessun DOM)
   Ogni voce del Diario può contenere:
     log: [{ k, nome, f:{kg,rip,sec}, plan:{serie,rip,ripMax,kg,sec,rec}, n, sets:[{kg,rip,sec,rec}], esito }]
   - kg, rip, sec, rec facoltativi per ogni serie (rec = recupero dopo la serie)
   - riepilogo: esercizi, serie, ripetizioni, volume (kg × ripetizioni)
   - conversione in misure per la funzione Progressi
   Usabile nel browser (window.HiftRegistro) e in Node.
   ========================================================= */
(function (root, factory) {
  var m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else root.HiftRegistro = m;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var FIELDS = ['kg', 'rip', 'sec', 'rec'];
  var LIM = { kg: [0, 500], rip: [0, 1000], sec: [0, 7200], rec: [0, 1800] };
  function num(v, k) {
    if (v == null || v === '') return null;
    var n = parseFloat(String(v).replace(',', '.'));
    if (!isFinite(n)) return null;
    n = Math.min(LIM[k][1], Math.max(LIM[k][0], n));
    return k === 'kg' ? Math.round(n * 4) / 4 : Math.round(n);
  }
  function hasData(s) { return !!s && FIELDS.some(function (k) { return s[k] != null; }); }

  /* registro vuoto dalle voci della sessione (stessa forma delle voci "pr" del player) */
  function nuovo(items) {
    return (items || []).filter(function (it) { return it && it.pr; }).map(function (it) {
      var pr = it.pr, n = Math.max(1, Math.min(30, Math.round(+pr.serie || 1)));
      return {
        key: it.key, k: pr.k, nome: it.name, txt: it.txt || '',
        f: { kg: !!pr.kg, rip: pr.rip !== false, sec: !!pr.sec },
        plan: { serie: pr.serie || null, rip: pr.target != null ? pr.target : null, ripMax: pr.ripMax || null, kg: pr.planKg != null ? pr.planKg : null, sec: pr.targetSec || null, rec: pr.rec != null ? pr.rec : null },
        n: n, sets: [], esito: null, target: pr.target, targetSec: pr.targetSec, fat: pr.fat
      };
    });
  }
  function riga(x, i) { while (x.sets.length <= i) x.sets.push({}); return x.sets[i]; }
  function imposta(x, i, campo, v) {
    if (FIELDS.indexOf(campo) < 0) return;
    var s = riga(x, i); s[campo] = num(v, campo);
    if (i + 1 > x.n) x.n = i + 1;
  }
  function aggiungi(x) { x.n = Math.min(30, x.n + 1); }
  function togli(x, i) { if (x.n <= 1) { x.sets = [{}]; return; } x.sets.splice(i, 1); x.n--; }
  /* riempie i campi vuoti con i valori previsti */
  function comePrevisto(x) {
    for (var i = 0; i < x.n; i++) {
      var s = riga(x, i);
      if (x.f.kg && s.kg == null && x.plan.kg != null) s.kg = x.plan.kg;
      if (x.f.rip && s.rip == null && x.plan.rip != null) s.rip = x.plan.rip;
      if (x.f.sec && s.sec == null && x.plan.sec != null) s.sec = x.plan.sec;
      if (s.rec == null && x.plan.rec != null && i < x.n - 1) s.rec = x.plan.rec;
    }
  }
  /* versione da salvare: solo esercizi con almeno un dato, valori puliti */
  function pulisci(log) {
    return (log || []).map(function (x) {
      var sets = (x.sets || []).slice(0, Math.max(x.n || 0, (x.sets || []).length)).map(function (s) {
        var o = {}; FIELDS.forEach(function (k) { var v = num(s && s[k], k); if (v != null) o[k] = v; }); return o;
      });
      while (sets.length && !hasData(sets[sets.length - 1])) sets.pop();
      return { k: String(x.k || ''), nome: String(x.nome || '').slice(0, 80), f: x.f || { kg: true, rip: true, sec: false }, plan: x.plan || {}, sets: sets, esito: x.esito || null };
    }).filter(function (x) { return x.k && x.nome && (x.sets.some(hasData) || x.esito); });
  }
  /* riapre un registro salvato per modificarlo */
  function riapri(log) {
    return (log || []).map(function (x) {
      return { k: x.k, nome: x.nome, txt: '', f: x.f || { kg: true, rip: true, sec: false }, plan: x.plan || {}, n: Math.max(1, (x.sets || []).length), sets: (x.sets || []).map(function (s) { return Object.assign({}, s); }), esito: x.esito || null };
    });
  }
  function riepilogo(log) {
    var r = { esercizi: 0, serie: 0, rip: 0, volume: 0, sec: 0, rec: [] };
    (log || []).forEach(function (x) {
      var done = (x.sets || []).filter(hasData);
      if (!done.length) return;
      r.esercizi++; r.serie += done.length;
      done.forEach(function (s) {
        if (s.rip != null) r.rip += s.rip;
        if (s.kg != null && s.rip != null) r.volume += s.kg * s.rip;
        if (s.sec != null) r.sec += s.sec;
        if (s.rec != null) r.rec.push(s.rec);
      });
    });
    r.volume = Math.round(r.volume);
    r.recMedio = r.rec.length ? Math.round(r.rec.reduce(function (a, b) { return a + b; }, 0) / r.rec.length) : null;
    delete r.rec;
    return r;
  }
  var fmtN = function (v) { return String(Math.round(v * 100) / 100).replace('.', ','); };
  function testoRiepilogo(r) {
    if (!r.esercizi) return '';
    var a = [r.esercizi + (r.esercizi === 1 ? ' esercizio' : ' esercizi'), r.serie + (r.serie === 1 ? ' serie' : ' serie')];
    if (r.rip) a.push(r.rip + ' rip');
    if (r.volume) a.push(r.volume.toLocaleString('it-IT') + ' kg sollevati');
    if (r.recMedio != null) a.push('rec. medio ' + r.recMedio + '"');
    return a.join(' · ');
  }
  function testoSerie(s) {
    var a = [];
    if (s.kg != null) a.push(fmtN(s.kg) + ' kg');
    if (s.rip != null) a.push((s.kg != null ? '× ' : '') + s.rip + ' rip');
    if (s.sec != null) a.push(s.sec + '"');
    if (s.rec != null) a.push('rec ' + s.rec + '"');
    return a.join(' ');
  }
  /* una misura per esercizio per la funzione Progressi: serie più pesante, numero di serie, recupero medio */
  function versoProgressi(log, base) {
    base = base || {};
    return (log || []).map(function (x) {
      var done = (x.sets || []).filter(hasData);
      if (!done.length && !x.esito) return null;
      var withKg = done.filter(function (s) { return s.kg != null; });
      var top = withKg.length ? withKg.reduce(function (a, s) { return s.kg > a.kg || (s.kg === a.kg && (s.rip || 0) > (a.rip || 0)) ? s : a; }) : null;
      var rips = done.map(function (s) { return s.rip; }).filter(function (v) { return v != null; });
      var secs = done.map(function (s) { return s.sec; }).filter(function (v) { return v != null; });
      var recs = done.map(function (s) { return s.rec; }).filter(function (v) { return v != null; });
      return Object.assign({}, base, {
        k: x.k, nome: x.nome, kg: top ? top.kg : null, rip: top && top.rip != null ? top.rip : rips.length ? Math.max.apply(null, rips) : null,
        sec: secs.length ? Math.max.apply(null, secs) : null, serie: done.length || null,
        rec: recs.length ? Math.round(recs.reduce(function (a, b) { return a + b; }, 0) / recs.length) : null,
        esito: x.esito || null, target: x.target != null ? x.target : null, targetSec: x.targetSec != null ? x.targetSec : null, fat: x.fat != null ? x.fat : null
      });
    }).filter(Boolean);
  }
  return { nuovo: nuovo, riga: riga, imposta: imposta, aggiungi: aggiungi, togli: togli, comePrevisto: comePrevisto, pulisci: pulisci, riapri: riapri,
    riepilogo: riepilogo, testoRiepilogo: testoRiepilogo, testoSerie: testoSerie, versoProgressi: versoProgressi, hasData: hasData, num: num };
});
