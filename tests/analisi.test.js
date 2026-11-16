/* Test di attività e analisi — node --test tests/ */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../analisi-core.js');
const NOW = new Date('2026-11-18T12:00:00').getTime(); // mercoledì
const at = (dAgo, o) => Object.assign({ date: new Date(NOW - dAgo * 864e5).toISOString() }, o);

test('discipline: sessioni esistenti dell\'app e nuove attività', () => {
  assert.equal(A.disciplina({ fmt: 'AMRAP' }), 'wod');
  assert.equal(A.disciplina({ fmt: 'HIFT' }), 'hift');
  assert.equal(A.disciplina({ fmt: 'PROGRAMMA' }), 'programma');
  assert.equal(A.disciplina({ fmt: 'ATTIVITA', att: 'yoga' }), 'yoga');
  assert.deepEqual(A.ATTIVITA, ['corsa', 'camminata', 'bici', 'nuoto', 'stretching', 'pilates', 'yoga']);
});
test('MET: dal Compendium per velocità, stile, tipo e intensità', () => {
  assert.equal(A.met({ att: 'corsa', min: 60, dist: 9.7 }).met, 9.8);
  assert.equal(A.met({ att: 'corsa', min: 30, dist: 6 }).met, 11.7);          // 12 km/h: tra 11,3 (11,0) e 12,1 km/h (11,8)
  assert.equal(A.met({ att: 'camminata', min: 60, dist: 4.8 }).met, 3.5);
  assert.equal(A.met({ att: 'bici', min: 60, dist: 24 }).met, 10.0);
  assert.equal(A.met({ att: 'bici', min: 60 , intensita: 'leggera' }).met, 4.0);
  assert.equal(A.met({ att: 'nuoto', min: 30, stile: 'farfalla' }).met, 13.8);
  assert.equal(A.met({ att: 'nuoto', min: 30, stile: 'libero', intensita: 'vigorosa' }).met, 9.8);
  assert.equal(A.met({ att: 'yoga', min: 60, yoga: 'hatha' }).met, 2.5);
  assert.equal(A.met({ att: 'stretching', min: 10 }).met, 2.3);
  assert.equal(A.met({ att: 'pilates', min: 45 }).met, 3.0);
  assert.equal(A.met({ fmt: 'AMRAP', rpe: 9 }).met, 8.0);
  assert.equal(A.met({ fmt: 'PROGRAMMA', rpe: 4 }).met, 3.5);
  assert.equal(A.met({ att: 'corsa', min: 40, rpe: 3 }).met, 7.0, 'senza distanza: intensità dall\'RPE');
});
test('calorie e MET-minuti: MET × peso × ore', () => {
  const e = A.arricchisci({ date: new Date(NOW).toISOString(), att: 'corsa', min: 60, dist: 9.7 }, 70);
  assert.equal(e.kcal, Math.round(9.8 * 70));
  assert.equal(e.metmin, Math.round(9.8 * 60));
  assert.equal(e.modEq, 120, 'attività vigorosa: i minuti valgono doppio per l\'OMS');
  assert.equal(A.arricchisci({ date: new Date(NOW).toISOString(), att: 'stretching', min: 20 }, 70).modEq, 0, 'attività leggera: non conta per i 150 minuti');
});
test('nuova attività: valori puliti, titolo e riepilogo', () => {
  const h = A.voce({ att: 'corsa', min: '50', dist: '10,0', rpe: 7, peso: 70, fc: 150 });
  assert.equal(h.fmt, 'ATTIVITA'); assert.equal(h.min, 50); assert.equal(h.dist, 10);
  assert.match(h.title, /Corsa · 10 km/); assert.match(h.res, /5'00"\/km/); assert.match(h.res, /FC 150/); assert.match(h.res, /kcal/);
  const n = A.voce({ att: 'nuoto', min: 30, dist: 1500, stile: 'rana' });
  assert.match(n.res, /1500 m/); assert.equal(n.stile, 'rana');
  const z = A.voce({ att: 'xx', min: -5 }); assert.equal(z.att, 'corsa'); assert.equal(z.min, 1);
  assert.equal(A.passo(12), '5\'00"/km');
});
test('analisi: settimane, minuti parziali per disciplina e totali', () => {
  const H = [
    at(0, { fmt: 'AMRAP', min: 30, rpe: 8 }), at(1, { fmt: 'HIFT', min: 40, rpe: 7 }), at(2, { att: 'corsa', fmt: 'ATTIVITA', min: 45, dist: 8 }),
    at(8, { att: 'yoga', fmt: 'ATTIVITA', min: 60 }), at(9, { fmt: 'PROGRAMMA', min: 55, rpe: 6 }), at(30, { att: 'nuoto', fmt: 'ATTIVITA', min: 30 }),
    at(400, { att: 'bici', fmt: 'ATTIVITA', min: 90 })
  ];
  const r = A.analizza(H, 70, { now: NOW, settimane: 12 });
  assert.equal(r.mesi, false); assert.equal(r.buckets.length, 12);
  assert.equal(r.tot.min, 30 + 40 + 45 + 60 + 55 + 30);
  assert.equal(r.tot.sessioni, 6);
  const d = Object.fromEntries(r.perDisc.map(x => [x.k, x]));
  assert.equal(d.wod.min, 30); assert.equal(d.hift.min, 40); assert.equal(d.corsa.min, 45); assert.equal(d.corsa.dist, 8); assert.equal(d.bici.min, 0);
  const last = r.buckets[r.buckets.length - 1];
  assert.equal(last.min, 30 + 40 + 45); assert.equal(last.fam.funz, 70); assert.equal(last.fam.corsa, 45);
  assert.equal(r.buckets.reduce((a, b) => a + b.min, 0), r.tot.min, 'la somma delle settimane è il totale');
  const y = A.analizza(H, 70, { now: NOW, settimane: 52 });
  assert.equal(y.mesi, true); assert.ok(y.buckets.length >= 12 && y.buckets.length <= 13);
  const all = A.analizza(H, 70, { now: NOW, settimane: Infinity });
  assert.equal(all.tot.min, r.tot.min + 90);
});
test('OMS: minuti moderati equivalenti e giorni di forza della settimana', () => {
  const H = [at(0, { fmt: 'AMRAP', min: 30, rpe: 8 }), at(1, { fmt: 'HIFT', min: 40, rpe: 5 }), at(2, { att: 'camminata', fmt: 'ATTIVITA', min: 30, dist: 2.4 }), at(5, { att: 'corsa', fmt: 'ATTIVITA', min: 60 })];
  const o = A.oms(H, 70, NOW);
  assert.equal(o.giorniForza, 2);
  assert.equal(o.modEq, 60 + 40 + 30); // vigoroso ×2, moderato ×1; la corsa di 5 giorni fa è della settimana prima
  assert.equal(o.ok, false);
});
