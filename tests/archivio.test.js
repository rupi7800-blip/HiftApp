/* Test dell'archivio reale (archivio-esercizi.json, generato dagli Atlanti 100) */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const H = require('../hift-method-core.js');
const RAW = require('../archivio-esercizi.json');
const { ATTREZZI, load } = require('../tools/estrai-atlanti.js');
const ROOT = path.join(__dirname, '..');
const A = H.normalizeArchive(RAW);
const ORDER = ['petto', 'quadricipiti', 'spalle', 'glutei', 'dorso'];

test('archivio reale: 600 esercizi validi, 100 per CORE e per ogni stazione', () => {
  assert.equal(A.report.total, 600);
  assert.equal(A.exercises.length, 600);
  assert.equal(A.report.invalid.length, 0);
  assert.equal(A.report.duplicates.length, 0);
  assert.equal(A.report.unclassified.length, 0);
  assert.equal(A.report.noLevel, 0);
  for (const k of ['core', ...ORDER]) assert.equal(A.exercises.filter(e => e.primary === k).length, 100, k);
});
test('archivio reale: ogni esercizio corrisponde al suo atlante (nessun esercizio aggiunto o cambiato)', () => {
  const files = { CORE: 'core', PET: 'petto', QUA: 'quadricipiti', SPA: 'spalle', GLU: 'glutei', DOR: 'dorso' };
  for (const [pref, k] of Object.entries(files)) {
    const R = load('atlante-' + k + '.html');
    assert.equal(R.X.length, 100);
    for (const x of R.X) {
      const e = RAW.esercizi.find(z => z.id === pref + '-' + String(x.n).padStart(3, '0'));
      assert.ok(e, pref + x.n);
      assert.equal(e.nome, x.name);
      assert.equal(e.livello, x.l);
      assert.equal(e.esecuzione.join(' '), x.d.replace(/\s+/g, ' ').trim());
    }
  }
});
test('archivio reale: attrezzi solo dal glossario, immagini presenti e sicure', () => {
  const known = new Set(Object.keys(ATTREZZI).map(H.eqKey));
  for (const e of A.exercises) {
    e.attrezzatura.flat().forEach(k => assert.ok(known.has(k), e.id + ': ' + k));
    assert.ok(fs.existsSync(path.join(ROOT, e.immagine)), e.immagine);
    const svg = fs.readFileSync(path.join(ROOT, e.immagine), 'utf8');
    assert.ok(!/<script|on\w+=|javascript:/i.test(svg), e.id + ' svg non sicuro');
  }
});
test('archivio reale: classificazione attrezzi delle categorie degli atlanti', () => {
  const at = (id) => A.byId[id].attrezzatura.map(r => r.join('|'));
  assert.deepEqual(at('PET-001'), ['corpo libero']);
  const n = e => +e.id.split('-')[1], dist = A.exercises.filter(e => !e.id.startsWith('CORE'));
  const has = (e, k) => e.attrezzatura.some(r => r.includes(k));
  assert.ok(dist.filter(e => n(e) <= 35).every(e => !has(e, 'powerbag') && !has(e, 'med ball') && !has(e, 'trx')), 'A-B corpo libero');
  assert.ok(dist.filter(e => n(e) >= 36 && n(e) <= 55).every(e => has(e, 'powerbag')), 'C powerbag');
  assert.ok(dist.filter(e => n(e) >= 56 && n(e) <= 75).every(e => has(e, 'med ball')), 'D med ball');
  assert.ok(dist.filter(e => n(e) >= 76).every(e => has(e, 'trx')), 'E TRX');
  assert.ok(at('DOR-014').includes('tavolo robusto'));
  assert.ok(at('QUA-004').includes('muro'));
  assert.ok(at('CORE-054').includes('elastici|cavo'));
});
test('archivio reale: schede sempre coerenti con qualsiasi attrezzatura e livello', () => {
  const sets = [['corpo libero'], ['corpo libero', 'trx'], ['corpo libero', 'powerbag', 'med ball'], ['corpo libero', 'trx', 'powerbag', 'med ball', 'rialzo', 'muro', 'kettlebell', 'elastici']];
  for (const eq of sets) for (let level = 1; level <= 3; level++) for (let seed = 1; seed <= 60; seed++) {
    const p = H.generate(A, { eq, level, seed, history: [] }, 'tempo');
    assert.equal(H.blocking(p), false, eq + ' L' + level + ' ' + JSON.stringify(p.issues));
    const ids = [...p.core.esercizi.map(x => x.id), ...p.circuito.stazioni.map(s => s.id)];
    assert.equal(new Set(ids).size, 8);
    assert.equal(new Set(ids.map(id => A.byId[id].famiglia)).size, 8, 'varianti dello stesso esercizio');
    assert.deepEqual(p.circuito.stazioni.map(s => A.byId[s.id].primary), ORDER);
    p.core.esercizi.forEach(x => assert.equal(A.byId[x.id].primary, 'core'));
    ids.forEach(id => { const e = A.byId[id]; assert.ok(H.eqOk(e, new Set(eq))); assert.ok(e.livello <= level); });
  }
});
test('archivio reale: stesso esercizio in due atlanti (Bear crawl) mai due volte nella stessa scheda', () => {
  assert.equal(A.byId['CORE-028'].famiglia, A.byId['SPA-008'].famiglia);
});
