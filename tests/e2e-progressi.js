/* Test end-to-end della funzione Progressi (Playwright).
   Avvio: python3 -m http.server 8765 (dalla cartella dell'app), poi  node tests/e2e-progressi.js [cartella-screenshot] */
const { chromium } = require('playwright');
const URL = process.env.HIFT_URL || 'http://localhost:8765/index.html';
const OUT = process.argv[2] || null;
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const skipToEnd = async p => { for (let i = 0; i < 400; i++) { if (!(await p.$('#pNext'))) break; await p.click('#pNext'); } };

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.click('#obNext'); await p.click('#obNext');
  await p.click('[data-many="eq"][data-v="kettlebell"]'); await p.click('[data-many="eq"][data-v="trx"]');
  await p.click('#obNext'); await p.click('[data-ok]'); await p.click('#obNext'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => PROG.on && PROG.entries.length === 0), 'progressi attivi di base, nessun dato');
  ok(await p.evaluate(() => !state.session.why.some(w => w.startsWith('Progressi'))), 'senza dati il WOD non cambia');

  // ---------- WOD: registrazione a fine allenamento ----------
  // sessione con almeno un esercizio a tempo (es. plank), per verificare i campi giusti
  ok(await p.evaluate(() => { for (let seed = 1; seed < 500; seed++) { const s = generate(state.P, { minutes: 30, focus: 'core', format: 'AMRAP', seed });
    if (s.blocks.find(b => b.kind === 'wod').items.some(i => EX[i.id].unit === 'sec')) { state.session = s; store.set('session', s); renderHome(); return true; } } return false; }), 'sessione di prova con un esercizio a tempo');
  await p.click('#go'); await p.waitForTimeout(200); await skipToEnd(p);
  ok(await p.isVisible('#fPrT'), 'fine allenamento: "Registra i progressi" presente');
  await p.click('#fPrT');
  const n = await p.evaluate(() => PL.prItems.length);
  ok(n >= 2 && await p.evaluate(() => PL.prItems.every(it => it.pr.k.startsWith('w:'))), 'modulo con gli esercizi del WOD (' + n + ', senza riscaldamento e stretching)');
  for (let i = 0; i < n; i++) {
    await p.click(`[data-pi="${i}"] [data-pes="facile"]`);
    const t = await p.evaluate(i => PL.prItems[i].pr, i);
    if (t.target) await p.fill(`[data-pv="${i}:rip"]`, String(t.target + 3));
    if (t.targetSec) { ok(!(await p.$(`[data-pv="${i}:rip"]`)) && !!(await p.$(`[data-pv="${i}:sec"]`)), 'esercizio a tempo: si registrano i secondi, non le ripetizioni'); await p.fill(`[data-pv="${i}:sec"]`, String(t.targetSec + 5)); }
  }
  if (await p.$('[data-pv="0:kg"]')) await p.fill('[data-pv="0:kg"]', '16');
  await p.click('[data-prec="lunghi"]'); await p.click('[data-rpe="5"]');
  if (OUT) await p.screenshot({ path: OUT + '/p1-fine-allenamento.png', fullPage: true });
  const first = await p.evaluate(() => PL.prItems.map(it => it.pr.k));
  await p.click('#fSave'); await p.waitForTimeout(400);
  ok(await p.evaluate(n => PROG.entries.length === n && PROG.sessions.length === 1, n), 'salvati ' + n + ' progressi e la sessione');
  ok(await p.evaluate(k => PR.exState(PROG, k[0], state.P.goal).fattore > 1, first), 'esercizio facile e sopra obiettivo: volume in aumento');

  // il WOD successivo usa i progressi: genera con gli stessi esercizi e confronta
  const cmp = await p.evaluate(keys => {
    const ids = keys.map(k => k.slice(2)), P = state.P;
    const s = generate(P, { minutes: 30, focus: 'auto', format: 'AMRAP', seed: 4242 });
    const off = (() => { const o = PROG.on; PROG.on = false; const r = generate(P, { minutes: 30, focus: 'auto', format: 'AMRAP', seed: 4242 }); PROG.on = o; return r; })();
    const a = s.blocks.find(b => b.kind === 'wod').items, z = off.blocks.find(b => b.kind === 'wod').items;
    return { same: a.map(i => i.id).join() === z.map(i => i.id).join(), up: a.some((it, i) => ids.includes(it.id) && it.n > z[i].n), any: a.some(it => ids.includes(it.id)), why: s.why.join(' ') };
  }, first);
  ok(cmp.why.includes('Progressi'), 'WOD: il "perché" spiega l\'adattamento');
  ok(!cmp.same || !cmp.any || cmp.up, 'WOD: ripetizioni più alte sugli esercizi che hai trovato facili');

  // ---------- Diario → Progressi: registrazione manuale ----------
  await p.evaluate(() => { state.dtab = 'progressi'; go('diario'); }); await p.waitForTimeout(300);
  ok(await p.isVisible('text=Stato attuale'), 'Diario: pagina Progressi con lo stato attuale');
  await p.click('#prAdd'); await p.waitForTimeout(200);
  await p.fill('#pgQ', 'swing'); await p.waitForTimeout(200);
  await p.click('#sheet [data-pgsel] >> nth=0');
  await p.fill('[data-pv="m:kg"]', '20'); await p.fill('[data-pv="m:rip"]', '15'); await p.fill('[data-pv="m:rec"]', '60');
  await p.click('#sheet [data-mes="giusto"]');
  if (OUT) await p.screenshot({ path: OUT + '/p2-registra.png' });
  await p.click('#pgSave'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => PROG.entries.some(e => e.k === 'w:kbswing' && e.kg === 20 && e.rec === 60 && e.src === 'manuale')), 'registrazione manuale: carico, ripetizioni, recupero');
  await p.click('[data-prk="w:kbswing"]'); await p.waitForTimeout(200);
  ok(await p.isVisible('#sheet >> text=Record 20 kg'), 'scheda esercizio: record e prossimo carico');
  await p.click('#sheet [data-pgdel] >> nth=0'); await p.click('#sheet [data-pgdel] >> nth=0'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => !PROG.entries.some(e => e.k === 'w:kbswing')), 'registrazione eliminata (con conferma)');
  await p.evaluate(() => closeSheet());

  // suggerimento di livello dopo sessioni facili
  await p.evaluate(() => { for (let i = 0; i < 5; i++) { const s = PR.addSession(PROG, { d: new Date(Date.now() - (i + 1) * 864e5).toISOString(), rpe: 4 }); PR.addEntries(PROG, [{ k: 'w:squat', nome: 'Air squat', esito: 'facile', sid: s.id, d: s.d }]); } saveProg(); renderDiary(); });
  const lv0 = await p.evaluate(() => state.P.level);
  ok(await p.isVisible('[data-prlv]'), 'stato: suggerito il livello successivo');
  if (OUT) await p.screenshot({ path: OUT + '/p3-progressi.png', fullPage: true });
  await p.click('[data-prlv]'); await p.waitForTimeout(200);
  ok(await p.evaluate(l => state.P.level === l + 1, lv0), 'livello aggiornato dal suggerimento');

  // ---------- HIFT Method: circuito adattato, CORE invariato ----------
  await p.evaluate(() => go('metodo')); await p.waitForTimeout(900);
  await p.click('#hGen'); await p.waitForTimeout(500);
  const h = await p.evaluate(() => ({ ad: HM.draft.adatt || [], core: [HM.draft.core.serie, HM.draft.core.lavoro, HM.draft.core.recupero].join('/'), err: HC.blocking(HM.draft) }));
  ok(h.ad.length > 0, 'HIFT: parametri del circuito adattati (' + h.ad.join('; ') + ')');
  ok(h.core === '4/30/30', 'HIFT: il CORE resta 4 serie 30"/30"');
  ok(await p.isVisible('text=Adattato ai tuoi progressi'), 'HIFT: adattamento mostrato nella scheda');
  ok(!h.err, 'HIFT: scheda valida');
  await p.click('#hStart'); await p.waitForTimeout(200); await skipToEnd(p);
  await p.click('#fPrT');
  const hn = await p.evaluate(() => PL.prItems.length);
  ok(hn === 8 && await p.evaluate(() => PL.prItems.every(it => it.pr.k.startsWith('h:'))), 'HIFT: modulo con 3 esercizi CORE e 5 stazioni');
  await p.click('[data-pi="0"] [data-pes="duro"]'); await p.fill('[data-pv="0:sec"]', '25');
  await p.click('#fSave'); await p.waitForTimeout(400);
  const hk = await p.evaluate(() => PROG.entries.find(e => e.k.startsWith('h:')));
  ok(hk && hk.esito === 'duro' && hk.sec === 25 && hk.src === 'hift', 'HIFT: progresso salvato');
  await p.evaluate(() => { HM.tab = 'prog'; renderMethod(); }); await p.waitForTimeout(200);
  ok(await p.isVisible('.hx-p'), 'HIFT: nella scheda compare "ultima volta" sull\'esercizio');
  if (OUT) await p.screenshot({ path: OUT + '/p4-hift.png', fullPage: true });

  // ---------- disattivazione dal Profilo ----------
  await p.evaluate(() => go('profilo')); await p.waitForTimeout(200);
  await p.click('#progT');
  ok(await p.evaluate(() => PROG.on === false && PROG.entries.length > 0), 'disattivati: i dati restano salvati');
  ok(await p.evaluate(() => !generate(state.P, { minutes: 30, seed: 9 }).why.some(w => w.startsWith('Progressi'))), 'disattivati: gli allenamenti tornano alla base');
  await p.evaluate(() => go('oggi')); await p.waitForTimeout(200);
  await p.click('#go'); await p.waitForTimeout(200); await skipToEnd(p);
  ok(!(await p.$('#fPrT')), 'disattivati: niente modulo a fine allenamento');
  await p.click('#fSkip');
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  ok(!overflow, 'nessuno scorrimento orizzontale a 390px');
  ok(!errs.length, 'nessun errore JavaScript' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fails ? fails + ' FALLITI' : 'TUTTI I TEST PROGRESSI SUPERATI');
  process.exit(fails ? 1 : 0);
})();
