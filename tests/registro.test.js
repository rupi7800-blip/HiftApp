/* Test del registro dell'allenamento — node --test tests/ */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../registro-core.js');

const items = [
  { key: 'a', name: 'Squat', txt: '4 × 6–8', pr: { k: 'w:backsquat', kg: true, rip: true, serie: 4, target: 6, ripMax: 8, planKg: 60, rec: 120 } },
  { key: 'b', name: 'Plank', txt: '3 × 40"', pr: { k: 'w:plank', rip: false, sec: true, targetSec: 40, serie: 3, rec: 45 } },
  { key: 'c', name: 'Riscaldamento', txt: '' }
];

test('nuovo registro: righe dalle serie previste, campi secondo l\'esercizio', () => {
  const L = R.nuovo(items);
  assert.equal(L.length, 2, 'le voci senza registro (riscaldamento) sono escluse');
  assert.equal(L[0].n, 4); assert.deepEqual(L[0].f, { kg: true, rip: true, sec: false });
  assert.deepEqual(L[1].f, { kg: false, rip: false, sec: true });
  assert.equal(L[0].plan.kg, 60); assert.equal(L[0].plan.rec, 120);
});
test('inserimento: valori puliti, virgola decimale, limiti', () => {
  const L = R.nuovo(items);
  R.imposta(L[0], 0, 'kg', '62,5'); R.imposta(L[0], 0, 'rip', '8'); R.imposta(L[0], 0, 'rec', '135');
  R.imposta(L[0], 1, 'kg', '9999'); R.imposta(L[0], 1, 'rip', 'abc');
  R.imposta(L[0], 5, 'rip', 6);
  assert.deepEqual(L[0].sets[0], { kg: 62.5, rip: 8, rec: 135 });
  assert.equal(L[0].sets[1].kg, 500); assert.equal(L[0].sets[1].rip, null);
  assert.equal(L[0].n, 6, 'una serie oltre quelle previste allunga il registro');
});
test('come previsto, aggiungi e togli serie', () => {
  const L = R.nuovo(items);
  R.imposta(L[0], 0, 'kg', 65);
  R.comePrevisto(L[0]);
  assert.deepEqual(L[0].sets.map(s => s.kg), [65, 60, 60, 60], 'i valori già scritti non vengono sovrascritti');
  assert.ok(L[0].sets.every(s => s.rip === 6));
  assert.deepEqual(L[0].sets.map(s => s.rec), [120, 120, 120, undefined], 'nessun recupero dopo l\'ultima serie');
  R.aggiungi(L[0]); assert.equal(L[0].n, 5);
  R.togli(L[0], 0); assert.equal(L[0].n, 4); assert.equal(L[0].sets[0].kg, 60);
});
test('salvataggio: solo esercizi con dati, serie vuote finali eliminate; riapertura', () => {
  const L = R.nuovo(items);
  R.imposta(L[0], 0, 'kg', 60); R.imposta(L[0], 0, 'rip', 8); R.imposta(L[0], 1, 'kg', 60); R.imposta(L[0], 1, 'rip', 7);
  const S = R.pulisci(L);
  assert.equal(S.length, 1); assert.equal(S[0].sets.length, 2); assert.equal(S[0].nome, 'Squat');
  const L2 = R.riapri(S);
  assert.equal(L2[0].n, 2); L2[0].sets[0].kg = 70;
  assert.equal(S[0].sets[0].kg, 60, 'la riapertura non modifica il registro salvato');
  L[1].esito = 'facile';
  assert.equal(R.pulisci(L).length, 2, 'anche la sola sensazione viene salvata');
});
test('riepilogo: serie, ripetizioni, volume, recupero medio', () => {
  const log = [{ k: 'w:a', nome: 'A', sets: [{ kg: 60, rip: 8, rec: 120 }, { kg: 60, rip: 7, rec: 130 }, { kg: 55, rip: 8 }] }, { k: 'w:b', nome: 'B', sets: [{ sec: 40, rec: 45 }, { sec: 35 }] }];
  const r = R.riepilogo(log);
  assert.deepEqual(r, { esercizi: 2, serie: 5, rip: 23, volume: 60 * 8 + 60 * 7 + 55 * 8, sec: 75, recMedio: Math.round((120 + 130 + 45) / 3) });
  assert.match(R.testoRiepilogo(r), /2 esercizi · 5 serie · 23 rip · 1\.?340 kg sollevati · rec. medio 98"/);
  assert.equal(R.testoSerie({ kg: 62.5, rip: 8, rec: 120 }), '62,5 kg × 8 rip rec 120"');
});
test('verso Progressi: serie più pesante, numero di serie, recupero medio', () => {
  const log = [{ k: 'w:a', nome: 'A', sets: [{ kg: 60, rip: 8, rec: 120 }, { kg: 65, rip: 5, rec: 150 }, { kg: 65, rip: 6 }], esito: 'giusto', target: 6 },
    { k: 'w:b', nome: 'B', sets: [{ rip: 12 }, { rip: 15 }] }, { k: 'w:c', nome: 'C', sets: [] }];
  const P = R.versoProgressi(log, { src: 'wod', sid: 'x' });
  assert.equal(P.length, 2);
  assert.deepEqual([P[0].kg, P[0].rip, P[0].serie, P[0].rec, P[0].esito, P[0].target, P[0].sid], [65, 6, 3, 135, 'giusto', 6, 'x']);
  assert.deepEqual([P[1].kg, P[1].rip, P[1].serie], [null, 15, 2]);
});
