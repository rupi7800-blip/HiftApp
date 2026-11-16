/* Test della funzione Progressi — node --test tests/ */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../progressi-core.js');
const NOW = new Date('2026-11-16T10:00:00Z').getTime();
const ago = d => new Date(NOW - d * 864e5).toISOString();

test('registrazione: campi facoltativi, valori puliti, voci vuote scartate', () => {
  const p = P.empty();
  const n = P.addEntries(p, [
    { k: 'w:squat', nome: 'Air squat', rip: '15', esito: 'facile', d: ago(1) },
    { k: 'w:squat', nome: 'Air squat', d: ago(1) },             // nessun dato: scartata
    { k: 'h:PET-001', nome: 'Push-up', kg: '-5', rip: 12.6 },     // kg fuori limite → 0
    { k: 'w:plank', sec: 'abc', esito: 'boh' }                     // nessun dato valido: scartata
  ]);
  assert.equal(n, 2);
  assert.equal(p.entries.find(e => e.k === 'h:PET-001').rip, 13);
  assert.equal(p.entries.find(e => e.k === 'h:PET-001').kg, 0);
});
test('esercizio: migliori valori, andamento, carico suggerito secondo l\'obiettivo', () => {
  const p = P.empty();
  P.addEntries(p, [
    { k: 'w:kbswing', kg: 12, rip: 15, d: ago(20) },
    { k: 'w:kbswing', kg: 12, rip: 15, d: ago(14) },
    { k: 'w:kbswing', kg: 16, rip: 15, d: ago(7) },
    { k: 'w:kbswing', kg: 16, rip: 15, esito: 'facile', target: 15, d: ago(1) }
  ]);
  const f = P.exState(p, 'w:kbswing', 'forza', NOW);
  assert.equal(f.best.kg, 16);
  assert.equal(f.trend, 'su');
  assert.equal(f.kg, 17);   // forza: facile → +5%
  const r = P.exState(p, 'w:kbswing', 'resistenza', NOW);
  assert.equal(r.kg, 16); // resistenza: facile → +2,5%, arrotondato a 16
  assert.ok(r.fattore > f.fattore, 'resistenza cresce più in volume che in carico');
});
test('esercizio: se non raggiungi le ripetizioni il carico non sale e il volume scende', () => {
  const p = P.empty();
  P.addEntries(p, [{ k: 'w:pushup', rip: 8, target: 12, esito: 'duro', kg: 10, fat: 1, d: ago(2) }]);
  const s = P.exState(p, 'w:pushup', 'forza', NOW);
  assert.ok(s.kg <= 10);
  assert.ok(s.fattore < 0.92);
});
test('esercizio: progressione cumulativa e ripresa graduale dopo una pausa', () => {
  const p = P.empty();
  P.addEntries(p, [{ k: 'w:squat', rip: 18, target: 15, esito: 'facile', fat: 1.3, d: ago(2) }]);
  const s = P.exState(p, 'w:squat', 'dimagrimento', NOW);
  assert.ok(s.fattore > 1.3 && s.fattore <= 1.8);
  const q = P.empty();
  P.addEntries(q, [{ k: 'w:squat', rip: 18, target: 15, esito: 'facile', fat: 1.3, d: ago(70) }]);
  const t = P.exState(q, 'w:squat', 'dimagrimento', NOW);
  assert.ok(t.fattore < 1.15, 'dopo 70 giorni il fattore torna vicino alla base: ' + t.fattore);
});
test('stato generale: sessioni facili → più carico; dure → meno; recuperi dal riscontro', () => {
  const easy = P.empty();
  for (let i = 0; i < 5; i++) {
    const s = P.addSession(easy, { d: ago(i * 2 + 1), rpe: 5, rec: 'lunghi' });
    P.addEntries(easy, [{ k: 'w:squat', esito: 'facile', sid: s.id, d: s.d }]);
  }
  const ge = P.globalState(easy, 'dimagrimento', 1, NOW);
  assert.ok(ge.g >= 1.2, 'g=' + ge.g);
  assert.ok(ge.rec < 0);
  assert.deepEqual(ge.livello, { verso: 'su', a: 2 });
  const hard = P.empty();
  for (let i = 0; i < 4; i++) P.addSession(hard, { d: ago(i * 2 + 1), rpe: 10, rec: 'corti' });
  const gh = P.globalState(hard, 'forza', 2, NOW);
  assert.ok(gh.g < 0.9);
  assert.ok(gh.rec > 0);
  assert.equal(gh.livello && gh.livello.verso, 'giu');
  const old = P.empty();
  P.addSession(old, { d: ago(90), rpe: 3 });
  assert.equal(P.globalState(old, 'forza', 2, NOW).attivo, false, 'sessioni vecchie non contano');
});
test('adattamento HIFT: il circuito cambia secondo obiettivo, i valori restano nei limiti', () => {
  const gs = { g: 1.25, rec: -5 };
  const d = P.adaptHift('tempo', { lavoro: 40, recupero: 20, giri: 3, recGiri: 60 }, gs, 'dimagrimento');
  assert.ok(d.params.lavoro > 40 && d.params.recupero < 20 && d.params.giri === 4);
  assert.ok(d.changes.length >= 3);
  const f = P.adaptHift('tempo', { lavoro: 40, recupero: 20, giri: 3, recGiri: 60 }, gs, 'forza');
  assert.equal(f.params.lavoro, 40, 'forza: il tempo di lavoro non si allunga');
  const r = P.adaptHift('ripetizioni', { rip: 10, cambio: 30, giri: 3, recGiri: 90, secRip: 3 }, { g: 0.8, rec: 10 }, 'forza');
  assert.ok(r.params.rip < 10 && r.params.cambio > 30 && r.params.giri === 2);
  const n = P.adaptHift('tempo', { lavoro: 40, recupero: 20, giri: 3, recGiri: 60 }, { g: 1, rec: 0 }, 'salute');
  assert.equal(n.changes.length, 0, 'senza progressi nessuna modifica');
});
test('adattamento WOD: intervalli e recuperi di forza', () => {
  assert.equal(P.wodInterval(40, { g: 1, rec: 0 }, 'resistenza'), 40);
  assert.ok(P.wodInterval(40, { g: 1.3, rec: 0 }, 'resistenza') > 40);
  assert.ok(P.wodInterval(40, { g: 1, rec: 15 }, 'resistenza') < 40);
  assert.ok(P.wodInterval(45, { g: 1.35, rec: -20 }, 'dimagrimento') <= 50);
  assert.equal(P.strengthRest(120, { rec: 20 }), 140);
  assert.equal(P.strengthRest(90, { rec: -40 }), 60);
});
test('riepilogo e rimozione', () => {
  const p = P.empty();
  P.addEntries(p, [{ k: 'w:a', nome: 'A', rip: 5, d: ago(3) }, { k: 'w:a', nome: 'A', rip: 7, d: ago(1) }, { k: 'h:B', nome: 'B', kg: 8, d: ago(2) }]);
  const s = P.summaryAll(p, 'forza', NOW);
  assert.equal(s.length, 2);
  assert.deepEqual(s.find(x => x.key === 'w:a').serie, [5, 7]);
  assert.ok(P.removeEntry(p, p.entries[0].id));
  assert.equal(p.entries.length, 2);
  assert.equal(P.roundKg(7.3), 7.5); assert.equal(P.roundKg(23.4), 23); assert.equal(P.roundKg(61), 60);
});
