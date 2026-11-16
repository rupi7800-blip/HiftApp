/* Test della funzione "Crea programma" — node --test tests/ */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../programma-core.js');

/* catalogo di prova: stessa forma di quello che l'app costruisce da libreria WOD + archivio HIFT */
const C = [];
const add = (k, gruppi, o) => C.push(Object.assign({ k, nome: 'Es ' + k, gruppi, unita: 'rip', carico: false, livello: 1, multi: true }, o || {}));
['petto', 'dorso', 'spalle', 'quadricipiti', 'glutei', 'core'].forEach(g => {
  for (let i = 1; i <= 4; i++) add(g + i, [g], { carico: i % 2 === 0, livello: 1 + (i % 3), unita: g === 'core' && i === 1 ? 'sec' : 'rip', multi: i < 3 });
});

test('proposta: struttura per 2–6 giorni, tutti i gruppi, nessun doppione nello stesso giorno', () => {
  for (const n of [1, 2, 3, 4, 5, 6]) for (const ob of Object.keys(G.OBIETTIVI)) {
    const p = G.proposta({ obiettivo: ob, livello: 3, giorni: n }, C);
    assert.equal(p.giorni.length, n);
    assert.equal(new Set(p.giorni.map(g => g.wd)).size, n);
    p.giorni.forEach(g => { assert.ok(g.esercizi.length >= 2); assert.equal(new Set(g.esercizi.map(e => e.k)).size, g.esercizi.length); });
    if (n >= 2) { const v = G.volumeSettimanale(p); ['petto', 'dorso', 'quadricipiti', 'glutei'].forEach(gr => assert.ok(v[gr] > 0, ob + ' ' + n + ' ' + gr)); }
    assert.ok(!G.controlla(p).some(i => i.level === 'error'), JSON.stringify(G.controlla(p).filter(i => i.level === 'error')));
  }
});
test('proposta: parametri dentro le linee guida dell\'obiettivo', () => {
  for (const ob of Object.keys(G.OBIETTIVI)) {
    const O = G.OBIETTIVI[ob], p = G.proposta({ obiettivo: ob, livello: 2, giorni: 3 }, C);
    p.giorni.flatMap(g => g.esercizi).filter(e => e.gruppi[0] !== 'core').forEach(e => {
      const R = !e.carico && O.ripCL ? O.ripCL : O.rip;
      if (e.unita === 'rip') { assert.equal(e.ripMin, R[0]); assert.equal(e.ripMax, R[1]); }
      assert.ok(e.serie >= O.serie[0] && e.serie <= O.serie[1]);
      assert.ok(e.rec >= O.rec[0] && e.rec <= O.rec[1]);
      assert.ok(e.rir >= O.rir[0] && e.rir <= O.rir[1]);
    });
  }
});
test('proposta: con l\'attrezzatura disponibile sceglie esercizi con carico per la forza', () => {
  const p = G.proposta({ obiettivo: 'forza', livello: 3, giorni: 3 }, C);
  const all = p.giorni.flatMap(g => g.esercizi);
  [...new Set(all.map(e => e.gruppi[0]))].filter(g => g !== 'core').forEach(g => assert.ok(all.some(e => e.gruppi[0] === g && e.carico), 'nessun esercizio con carico per ' + g));
  assert.ok(all.filter(e => e.carico).length >= all.filter(e => !e.carico && e.gruppi[0] !== 'core').length, 'prevalgono gli esercizi con carico');
  p.giorni.flatMap(g => g.esercizi).filter(e => e.gruppi[0] === 'core').forEach(e => { assert.equal(e.pct, null); if (e.unita === 'rip') assert.deepEqual([e.ripMin, e.ripMax], [8, 12]); });
});
test('proposta: il livello limita gli esercizi', () => {
  const p = G.proposta({ obiettivo: 'forza', livello: 1, giorni: 3 }, C);
  p.giorni.flatMap(g => g.esercizi).forEach(e => assert.equal(C.find(c => c.k === e.k).livello, 1));
});

test('calendario: settimane, date, scarichi ogni N settimane, progressione lineare del carico', () => {
  const p = G.vuoto({ obiettivo: 'forza', settimane: 9, scarico: 4, inizio: '2026-11-18' }); // mercoledì
  const g = G.nuovoGiorno(p, 1, 'A');
  g.esercizi.push(G.pulisci({ giorni: [{ esercizi: [{ k: 'x', nome: 'Squat', gruppi: ['quadricipiti'], carico: true, serie: 5, ripMin: 5, ripMax: 5, kg: 100, rec: 180, rir: 2 }] }] }).giorni[0].esercizi[0]);
  const cal = G.calendario(p);
  assert.equal(cal.length, 9);
  assert.equal(cal[0].giorni[0].data, '2026-11-23'); // primo lunedì dopo l'inizio
  assert.equal(cal[1].giorni[0].data, '2026-11-30');
  assert.deepEqual(cal.map(s => s.scarico), [false, false, false, true, false, false, false, true, false]);
  const kg = cal.map(s => s.giorni[0].esercizi[0].kg);
  assert.equal(kg[0], 100);
  assert.ok(kg[1] > kg[0] && kg[2] > kg[1], 'progressione: ' + kg);
  assert.ok(kg[3] < kg[2], 'scarico: carico ridotto');
  assert.equal(cal[3].giorni[0].esercizi[0].serie, 3, 'scarico: serie al 60%');
  assert.ok(kg[4] > kg[2], 'dopo lo scarico si riparte dal livello raggiunto');
  // aumento settimanale entro il 10%
  for (let i = 1; i < kg.length; i++) if (!cal[i].scarico && !cal[i - 1].scarico) assert.ok(kg[i] / kg[i - 1] <= 1.1);
});
test('calendario: senza carico progredisce con ripetizioni e tempo; ondulata e a blocchi', () => {
  const p = G.vuoto({ obiettivo: 'ipertrofia', settimane: 6, scarico: 0, modello: 'lineare' });
  const g = G.nuovoGiorno(p, 2, 'A');
  g.esercizi.push(G.nuovoEsercizio({ k: 'a', nome: 'Push-up', gruppi: ['petto'], unita: 'rip' }, 'ipertrofia', 2));
  g.esercizi.push(G.nuovoEsercizio({ k: 'b', nome: 'Plank', gruppi: ['core'], unita: 'sec' }, 'ipertrofia', 2));
  const cal = G.calendario(p);
  assert.ok(cal[5].giorni[0].esercizi[0].ripMax > cal[0].giorni[0].esercizi[0].ripMax);
  assert.ok(cal[5].giorni[0].esercizi[1].sec > cal[0].giorni[0].esercizi[1].sec);
  p.modello = 'ondulata'; G.nuovoGiorno(p, 4, 'B').esercizi.push(G.nuovoEsercizio({ k: 'a', nome: 'Push-up', gruppi: ['petto'] }, 'ipertrofia', 2));
  const on = G.calendario(p)[0].giorni;
  assert.ok(on[0].esercizi[0].ripMax < on[1].esercizi[0].ripMax, 'ondulata: giorno pesante con meno ripetizioni');
  p.modello = 'blocchi'; p.settimane = 10;
  const bl = G.calendario(p);
  assert.deepEqual([...new Set(bl.map(s => s.fase))], ['Accumulo', 'Trasformazione', 'Realizzazione']);
});
test('massimale stimato e percentuali', () => {
  assert.equal(Math.round(G.stima1RM(100, 5)), 117);
  const p = G.vuoto({ obiettivo: 'forza', settimane: 2, scarico: 0 });
  G.nuovoGiorno(p, 1).esercizi.push(Object.assign(G.nuovoEsercizio({ k: 'sq', nome: 'Squat', gruppi: ['quadricipiti'], carico: true }, 'forza', 2), { pct: 85 }));
  assert.equal(G.calendario(p, { sq: { rm: 120 } })[0].giorni[0].esercizi[0].kg, 102.5);
  assert.equal(G.calendario(p)[0].giorni[0].esercizi[0].kg, null);
});

test('controllo: regole di recupero, volume, equilibrio, periodizzazione, ordine', () => {
  const p = G.vuoto({ obiettivo: 'ipertrofia', settimane: 12, scarico: 0, livello: 1 });
  const mk = (k, gr, o) => Object.assign(G.nuovoEsercizio({ k, nome: k, gruppi: [gr], carico: true }, 'ipertrofia', 2), o || {});
  const a = G.nuovoGiorno(p, 1, 'Lun'), b = G.nuovoGiorno(p, 2, 'Mar');
  a.esercizi.push(mk('core1', 'core'), mk('p1', 'petto', { serie: 5, ripMin: 3, ripMax: 4 }), mk('p2', 'petto', { serie: 5 }), mk('p3', 'petto', { serie: 5 }), mk('p4', 'petto', { serie: 5 }), mk('p5', 'petto', { serie: 5 }));
  b.esercizi.push(mk('p6', 'petto', { serie: 4 }));
  for (const wd of [3, 4, 5, 6, 7]) G.nuovoGiorno(p, wd).esercizi.push(mk('q' + wd, 'quadricipiti'));
  const msg = G.controlla(p).map(i => i.level + ' ' + i.area + ' ' + i.msg).join('\n');
  assert.match(msg, /Nessun giorno di riposo/);
  assert.match(msg, /principiante 2–4 sedute/);
  assert.match(msg, /48 ore/);
  assert.match(msg, /oltre il volume/);
  assert.match(msg, /Gruppo non allenato/);
  assert.match(msg, /senza scarico/);
  assert.match(msg, /core alla fine/);
  assert.match(msg, /lontane dall'intervallo/);
  assert.match(msg, /Manca la trazione/);
  const ok = G.proposta({ obiettivo: 'ipertrofia', livello: 2, giorni: 4 }, C);
  assert.ok(G.controlla(ok).some(i => i.level === 'ok') || !G.controlla(ok).some(i => i.level === 'warn' || i.level === 'error'));
});

test('esportazioni: JSON reimportabile, CSV, Excel, calendario, testo, Markdown, HTML', () => {
  const p = G.proposta({ obiettivo: 'forza', livello: 2, giorni: 3, settimane: 8, nome: 'Prova; "virgolette", a capo\ne àccénti' }, C);
  // JSON
  const q = G.fromJSON(G.toJSON(p));
  assert.equal(q.giorni.length, 3); assert.notEqual(q.id, p.id);
  assert.deepEqual(q.giorni.map(g => g.esercizi.map(e => e.k)), p.giorni.map(g => g.esercizi.map(e => e.k)));
  assert.throws(() => G.fromJSON('{"a":1}'));
  // CSV: BOM, separatore ;, una riga per esercizio per seduta
  const csv = G.toCSV(p);
  assert.ok(csv.startsWith('﻿Settimana;Fase;Data'));
  const nEs = p.giorni.reduce((a, g) => a + g.esercizi.length, 0);
  assert.equal(csv.trim().split('\r\n').length, 1 + nEs * 8);
  // Excel XML
  const xls = G.toXLS(p);
  assert.match(xls, /<Workbook/); assert.ok(xls.includes('&quot;virgolette&quot;'));
  assert.equal((xls.match(/<Row>/g) || []).length, 1 + nEs * 8 + 3);
  // iCalendar: un evento per seduta, righe ripiegate a 75 ottetti, caratteri protetti
  const ics = G.toICS(p);
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 3 * 8);
  ics.split('\r\n').forEach(l => assert.ok(Buffer.byteLength(l) <= 75, l));
  assert.match(ics, /Prova\\; "virgolette"\\, a capo\\ne/);
  // testo, Markdown, HTML
  assert.match(G.toText(p), /=== SETTIMANA 8/);
  assert.match(G.toMarkdown(p), /\| # \| Esercizio \| Prescrizione \|/);
  const html = G.toHTML(p);
  assert.match(html, /^<!doctype html>/); assert.ok(!html.includes('<script'));
  assert.ok(html.includes('Prova; &quot;virgolette&quot;'));
});
test('pulizia dei dati importati: valori fuori limite, campi mancanti', () => {
  const p = G.pulisci({ nome: 'X', settimane: 999, giorni: [{ wd: 9, esercizi: [{ k: 'a', nome: 'A', serie: 99, ripMin: 12, ripMax: 6, rec: -3, kg: 'x' }, { nome: 'senza k' }] }] });
  assert.equal(p.settimane, 52); assert.equal(p.giorni[0].wd, 7);
  const e = p.giorni[0].esercizi;
  assert.equal(e.length, 1); assert.equal(e[0].serie, 12); assert.deepEqual([e[0].ripMin, e[0].ripMax], [6, 12]); assert.equal(e[0].rec, 0); assert.equal(e[0].kg, null);
});
test('prossima seduta e durata stimata', () => {
  const p = G.proposta({ obiettivo: 'ipertrofia', livello: 2, giorni: 3, settimane: 4 }, C);
  assert.deepEqual([G.prossima(p).w, G.prossima(p).i], [0, 0]);
  p.fatte.push({ w: 0, g: p.giorni[0].id });
  assert.deepEqual([G.prossima(p).w, G.prossima(p).i], [0, 1]);
  const d = G.durataSeduta(p.giorni[0].esercizi);
  assert.ok(d > 15 && d < 90, d);
});
