/* Test del metodo HIFT — esegui con:  node --test tests/ */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('../hift-method-core.js');
const RAW = require('./fixtures/archivio-test.json');

const arch = H.normalizeArchive(RAW, { fonte: 'test' });
const ORDER = ['petto', 'quadricipiti', 'spalle', 'glutei', 'dorso'];
const ALL_EQ = arch.report.equipment.map(e => e.key);
const BW_ONLY = ['corpo libero'];
const ctx = (o) => Object.assign({ eq: ALL_EQ, level: 3, goal: 'dimagrimento', history: [] }, o);
const ids = (p) => [...p.core.esercizi.map(x => x && x.id), ...p.circuito.stazioni.map(s => s.id)];

/* ---------- integrazione archivio ---------- */
test('archivio: voci valide, duplicati e incomplete segnalati, nessun esercizio inventato', () => {
  assert.equal(arch.report.total, 27);
  assert.deepEqual(arch.report.duplicates, ['T-P1']);
  assert.equal(arch.report.invalid.length, 2); // senza id + senza attrezzatura
  assert.equal(arch.exercises.length, 24);
  const rawIds = new Set(RAW.esercizi.map(e => e.id).filter(Boolean));
  arch.exercises.forEach(e => assert.ok(rawIds.has(e.id)));
  assert.equal(arch.byId['T-P1'].nome, 'Test petto A'); // tenuta la prima voce
});
test('archivio: classificazione distretti, livelli, alternative, media sicuri', () => {
  assert.equal(arch.byId['T-C3'].primary, 'core');
  assert.equal(arch.byId['T-Q1'].primary, 'quadricipiti');
  assert.ok(arch.byId['T-Q1'].slots.glutei);
  assert.equal(arch.byId['T-D2'].primary, 'dorso');
  assert.equal(arch.byId['T-C3'].livello, 1);
  assert.deepEqual(arch.byId['T-Q2'].attrezzatura, [['kettlebell', 'manubri']]);
  assert.equal(arch.byId['T-M1'].immagine, '');
  assert.equal(arch.byId['T-M1'].video, 'https://example.org/v.mp4');
  assert.equal(arch.byId['T-C1'].famiglia, arch.byId['T-C2'].famiglia);
});
test('archivio: formato non valido o assente → messaggio chiaro', () => {
  const a = H.normalizeArchive(null);
  assert.equal(a.ok, false);
  assert.ok(a.report.warnings[0].includes('Formato non riconosciuto'));
  const b = H.normalizeArchive([]);
  assert.equal(b.ok, false);
});
test('archivio: accetta array semplice e oggetto indicizzato per ID', () => {
  const a = H.normalizeArchive([{ id: 1, name: 'X', muscle: 'chest', equipment: 'bodyweight', level: 2 }]);
  assert.equal(a.exercises[0].primary, 'petto');
  assert.deepEqual(a.exercises[0].attrezzatura, [['corpo libero']]);
  const b = H.normalizeArchive({ k1: { nome: 'Y', distretto: 'Dorso', attrezzatura: 'TRX' } });
  assert.equal(b.exercises[0].id, 'k1');
});

/* ---------- CORE ---------- */
test('CORE: sempre 3 esercizi diversi, 4 serie da 30"/30", attrezzatura rispettata', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const eq = seed % 3 === 0 ? BW_ONLY : seed % 3 === 1 ? ['corpo libero', 'elastici', 'trx'] : ALL_EQ;
    const p = H.generate(arch, ctx({ eq, seed, level: 1 + seed % 3 }), 'tempo');
    const core = p.core.esercizi;
    assert.equal(core.length, 3);
    assert.equal(p.core.serie, 4); assert.equal(p.core.lavoro, 30); assert.equal(p.core.recupero, 30);
    const cids = core.map(x => x && x.id);
    if (cids.every(Boolean)) {
      assert.equal(new Set(cids).size, 3);
      cids.forEach(id => {
        const e = arch.byId[id];
        assert.ok(e.slots.core, id + ' non è core');
        assert.ok(H.eqOk(e, new Set(eq)), id + ' attrezzatura non disponibile');
      });
    } else {
      assert.ok(p.issues.some(i => i.level === 'error' && i.part === 'core'));
    }
  }
});
test('CORE: sequenza del timer = 3 × 4 × (30" lavoro + 30" recupero) = 12 minuti', () => {
  const seq = H.expandCore();
  assert.equal(seq.filter(s => s.kind === 'work').length, 12);
  assert.ok(seq.filter(s => s.kind === 'work').every(s => s.dur === 30));
  assert.ok(seq.filter(s => s.kind === 'rest').every(s => s.dur === 30));
  assert.equal(seq.reduce((a, s) => a + s.dur, 0), 720);
});
test('CORE: preferisce esercizi davvero diversi (non varianti dello stesso)', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const p = H.generate(arch, ctx({ seed }), 'tempo');
    const fams = p.core.esercizi.map(x => arch.byId[x.id].famiglia);
    assert.equal(new Set(fams).size, 3);
  }
});

/* ---------- CIRCUITO ---------- */
test('CIRCUITO: 5 stazioni sempre nell\'ordine petto, quadricipiti, spalle, glutei, dorso', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const m = Object.keys(H.METHODS)[seed % 5];
    const p = H.generate(arch, ctx({ seed }), m);
    assert.deepEqual(p.circuito.stazioni.map(s => s.k), ORDER);
    p.circuito.stazioni.forEach(s => {
      const e = arch.byId[s.id];
      assert.ok(e, 'stazione vuota');
      assert.ok(e.slots[s.k], e.id + ' non coerente con ' + s.k);
    });
    assert.equal(new Set(ids(p)).size, 8, 'esercizi duplicati');
    assert.equal(H.blocking(p), false);
  }
});
test('CIRCUITO: solo attrezzatura selezionata (due attrezzi = entrambi richiesti)', () => {
  const eq = ['corpo libero', 'kettlebell'];
  for (let seed = 1; seed <= 200; seed++) {
    const p = H.generate(arch, ctx({ eq, seed }), 'tempo');
    ids(p).filter(Boolean).forEach(id => assert.ok(H.eqOk(arch.byId[id], new Set(eq)), id));
    assert.notEqual(p.circuito.stazioni[0].id, 'T-P3'); // richiede anche la panca
  }
});
test('CIRCUITO: senza esercizi compatibili → errore chiaro con alternative reali, niente invenzioni', () => {
  const p = H.generate(arch, ctx({ eq: BW_ONLY, level: 1, seed: 7 }), 'tempo');
  const dorso = p.circuito.stazioni[4];
  assert.equal(dorso.id, null);
  const err = p.issues.find(i => i.part === 'circ' && i.index === 4 && i.level === 'error');
  assert.ok(err && err.msg.includes('Dorso'));
  assert.ok(err.alternatives.length > 0);
  err.alternatives.forEach(a => assert.ok(arch.byId[a.id]));
  assert.ok(err.alternatives.some(a => a.id === 'T-D4' && a.motivo.includes('Tavolo')));
  assert.equal(H.blocking(p), true);
});
test('CIRCUITO: livello rispettato', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const p = H.generate(arch, ctx({ seed, level: 1 }), 'tempo');
    ids(p).filter(Boolean).forEach(id => { const l = arch.byId[id].livello; assert.ok(l == null || l <= 1, id); });
  }
});

/* ---------- metodi e durate ---------- */
const plan = (metodo, params) => { const p = H.generate(arch, ctx({ seed: 3 }), metodo, params); return p; };
test('durata: circuito a tempo', () => {
  const p = plan('tempo', { lavoro: 40, recupero: 20, giri: 3, recGiri: 60 });
  // 3 giri × (5×40 + 4×20) + 2 × 60
  assert.equal(H.durations(p).circuito, 3 * (200 + 80) + 120);
  assert.equal(H.durations(p).totale, 720 + 960);
});
test('durata: circuito a intervalli', () => {
  const p = plan('intervalli', { lavoro: 20, recupero: 10, serie: 3, cambio: 30, giri: 2, recGiri: 60 });
  const station = 3 * 20 + 2 * 10;
  assert.equal(H.durations(p).circuito, 2 * (5 * station + 4 * 30) + 60);
});
test('durata: circuito a tempo fisso = durata stabilita', () => {
  const p = plan('fisso', { durata: 20, giri: 4, pctLavoro: 67 });
  assert.equal(H.durations(p).circuito, 20 * 60);
  const sp = H.stationPlan(p.circuito).st[0];
  assert.equal(sp.lavoro + sp.recStaz, 60);
  const q = plan('fisso', { durata: 20, giri: 7, pctLavoro: 50 });
  assert.equal(H.durations(q).circuito, 34 * 35);
  assert.ok(q.issues.some(i => i.level === 'info'));
});
test('durata: circuito a ripetizioni (stima) con ripetizioni per stazione', () => {
  const p = plan('ripetizioni', { rip: 10, cambio: 30, giri: 2, recGiri: 90, secRip: 3 });
  p.circuito.stazioni[0].ov = { rip: 20 };
  const d = H.durations(p);
  assert.equal(d.stimata, true);
  assert.equal(d.circuito, 2 * ((20 + 40) * 3 + 4 * 30) + 90);
});
test('durata: circuito personalizzato per stazione', () => {
  const p = plan('personalizzato', { lavoro: 40, recupero: 20, serie: 1, giri: 2, recGiri: 60, secRip: 3 });
  p.circuito.stazioni[2].ov = { tipo: 'tempo', lavoro: 60, serie: 2, recupero: 15 };
  const seq = H.expandCircuit(p.circuito);
  const st2 = seq.filter(s => s.index === 2 && s.kind === 'work');
  assert.equal(st2.length, 4);
  assert.ok(st2.every(s => s.dur === 60));
  // giro: st0 40+20, st1 40+20, st2 60+15+60+15, st3 40+20, st4 40 → 370; ×2 + 60
  assert.equal(H.durations(p).circuito, 370 * 2 + 60);
});
test('parametri modificabili e validati entro limiti', () => {
  const s = H.sanitizeParams('tempo', { lavoro: 9999, recupero: -5, giri: 'x' }, 2, '');
  assert.equal(s.lavoro, 600); assert.equal(s.recupero, 0); assert.equal(s.giri, H.defaultParams('tempo', 2, '').giri);
});

/* ---------- modifica manuale e rigenerazione parziale ---------- */
test('cambiare un esercizio non tocca gli altri', () => {
  const p = H.generate(arch, ctx({ seed: 11 }), 'tempo');
  const before = ids(p);
  assert.ok(H.swap(p, arch, ctx({ seed: 11 }), 'circ', 2, 99));
  const after = ids(p);
  after.forEach((id, i) => { if (i !== 5) assert.equal(id, before[i]); });
  assert.notEqual(after[5], before[5]);
});
test('rigenerare il circuito mantiene CORE e scelte manuali bloccate', () => {
  const p = H.generate(arch, ctx({ seed: 5 }), 'tempo');
  const core = p.core.esercizi.map(x => x.id);
  const opts = H.options(p, arch, ctx(), 'circ', 0);
  H.setItem(p, 'circ', 0, opts[opts.length - 1].id, true);
  const manual = p.circuito.stazioni[0].id;
  for (let s = 1; s < 30; s++) {
    H.fill(p, arch, ctx({ seed: s * 31 }), 'circuito');
    assert.equal(p.circuito.stazioni[0].id, manual);
    assert.deepEqual(p.core.esercizi.map(x => x.id), core);
  }
});
test('storico: gli esercizi dell\'ultima scheda vengono ruotati', () => {
  let same = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const a = H.generate(arch, ctx({ seed }), 'tempo');
    const b = H.generate(arch, ctx({ seed: seed + 1000, history: [ids(a)] }), 'tempo');
    same += b.core.esercizi.filter(x => a.core.esercizi.some(y => y.id === x.id)).length;
  }
  // senza storico ~3 su 7 coincidono per caso (≈ 260 su 200 schede); con lo storico molti meno
  assert.ok(same < 150, 'ripetizioni troppo frequenti: ' + same);
});
test('esclusioni rispettate', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const p = H.generate(arch, ctx({ seed, exclude: ['T-C1', 'T-P1'] }), 'tempo');
    assert.ok(!ids(p).includes('T-C1')); assert.ok(!ids(p).includes('T-P1'));
  }
});
test('controllo: esercizio non più presente nell\'archivio blocca l\'avvio', () => {
  const p = H.generate(arch, ctx({ seed: 2 }), 'tempo');
  p.circuito.stazioni[1].id = 'NON-ESISTE';
  const iss = H.check(p, arch, ctx());
  assert.ok(iss.some(i => i.level === 'error' && i.msg.includes('non esiste')));
});
test('controllo: ordine stazioni alterato o regole CORE alterate = errore', () => {
  const p = H.generate(arch, ctx({ seed: 2 }), 'tempo');
  p.circuito.stazioni.reverse();
  p.core.lavoro = 45;
  const iss = H.check(p, arch, ctx());
  assert.ok(iss.some(i => i.msg.includes('ordine')));
  assert.ok(iss.some(i => i.msg.includes('regole fisse')));
});
