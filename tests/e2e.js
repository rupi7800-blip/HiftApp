/* Test end-to-end nel browser (Playwright).
   Avvio: python3 -m http.server 8765  (dalla cartella dell'app), poi  node tests/e2e.js [cartella-screenshot] */
const { chromium } = require('playwright');
const path = require('path');
const URL = process.env.HIFT_URL || 'http://localhost:8765/index.html';
const OUT = process.argv[2] || null;
const FIX = path.join(__dirname, 'fixtures', 'archivio-test.json');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload();
  // onboarding con kettlebell ed elastici nel profilo
  await p.click('#obNext'); await p.click('#obNext');
  await p.click('[data-many="eq"][data-v="kettlebell"]'); await p.click('[data-many="eq"][data-v="elastici"]');
  await p.click('#obNext'); await p.click('[data-ok]'); await p.click('#obNext'); await p.waitForTimeout(400);
  ok(await p.isVisible('#toMethod'), 'home: accesso a HIFT Method');
  // dati esistenti conservati: la sessione WOD funziona ancora
  ok(await p.evaluate(() => !!state.session && state.session.blocks.length >= 3), 'home: sessione WOD generata come prima');

  await p.click('#toMethod'); await p.waitForTimeout(400);
  ok(await p.isVisible('text=Archivio esercizi non collegato'), 'archivio assente: messaggio chiaro');
  ok(!(await p.$('#hGen')), 'archivio assente: nessun allenamento generato');
  if (OUT) await p.screenshot({ path: OUT + '/1-senza-archivio.png' });

  await p.setInputFiles('#hImp', FIX); await p.waitForTimeout(500);
  ok(await p.isVisible('text=24 esercizi'), 'archivio importato: 24 esercizi validi');
  const eq0 = await p.evaluate(() => HM.cfg.eq);
  ok(eq0.includes('corpo libero') && eq0.includes('kettlebell') && eq0.includes('elastici') && !eq0.includes('trx'), 'attrezzatura iniziale presa dal profilo: ' + eq0.join(','));

  await p.click('#hGen'); await p.waitForTimeout(300);
  let d = await p.evaluate(() => ({ core: HM.draft.core.esercizi.map(x => x.id), st: HM.draft.circuito.stazioni.map(s => s.k + ':' + s.id), err: HC.blocking(HM.draft) }));
  ok(d.core.length === 3 && new Set(d.core).size === 3, 'CORE: 3 esercizi diversi ' + d.core);
  ok(d.st.map(x => x.split(':')[0]).join() === 'petto,quadricipiti,spalle,glutei,dorso', 'circuito: ordine stazioni ' + d.st);
  ok(!d.err, 'scheda senza errori bloccanti');
  if (OUT) await p.screenshot({ path: OUT + '/2-scheda.png', fullPage: true });

  // attrezzatura: togliendo i kettlebell gli esercizi che li richiedono vengono segnalati
  await p.click('#hCfgT'); await p.click('[data-heq="kettlebell"]'); await p.waitForTimeout(200);
  const kbUsed = await p.evaluate(() => planIds(HM.draft).some(id => hx(id).attrezzatura.flat().includes('kettlebell')));
  const kbErr = await p.evaluate(() => HM.draft.issues.some(i => i.msg.includes('attrezzatura non selezionata')));
  ok(!kbUsed || kbErr, 'attrezzatura tolta: esercizi incompatibili segnalati');
  await p.click('[data-hregen="all"]'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => planIds(HM.draft).every(id => HC.eqOk(hx(id), new Set(HM.cfg.eq)))), 'rigenera tutto: solo attrezzatura selezionata');
  await p.click('[data-heq="kettlebell"]'); await p.click('[data-heq="trx"]'); await p.click('#hCfgT');

  // cambio singolo esercizio: gli altri restano
  const before = await p.evaluate(() => planIds(HM.draft));
  await p.click('[data-hswap="circ:2"]'); await p.waitForTimeout(150);
  const after = await p.evaluate(() => planIds(HM.draft));
  ok(after.filter((x, i) => x !== before[i]).length === 1 && after[5] !== before[5], 'cambia esercizio: solo la stazione 3 cambia');
  ok(await p.evaluate(() => HM.draft.origine === 'manuale'), 'stato: modificata manualmente');

  // scelta manuale + rigenera circuito: la scelta resta
  await p.click('[data-hpick="circ:0"]'); await p.waitForTimeout(200);
  const pickId = await p.getAttribute('#sheet [data-hset] >> nth=0', 'data-hset');
  await p.click('#sheet [data-hset] >> nth=0'); await p.waitForTimeout(200);
  const core0 = await p.evaluate(() => HM.draft.core.esercizi.map(x => x.id).join());
  for (let i = 0; i < 5; i++) { await p.click('[data-hregen="circuito"]'); await p.waitForTimeout(80); }
  ok(await p.evaluate(id => HM.draft.circuito.stazioni[0].id === id && HM.draft.circuito.stazioni[0].pin, pickId), 'rigenera circuito: la scelta manuale resta');
  ok(await p.evaluate(c => HM.draft.core.esercizi.map(x => x.id).join() === c, core0), 'rigenera circuito: il CORE non cambia');

  // metodi e durata
  const setPar = async (k, v) => { await p.fill(`[data-hpar="${k}"]`, String(v)); await p.dispatchEvent(`[data-hpar="${k}"]`, 'change'); await p.waitForTimeout(120); };
  await p.click('[data-hmet="tempo"]'); await setPar('lavoro', 40); await setPar('recupero', 20); await setPar('giri', 3); await setPar('recGiri', 60);
  ok(await p.evaluate(() => HC.durations(HM.draft).totale === 720 + 3 * (5 * 40 + 4 * 20) + 2 * 60), 'circuito a tempo: durata calcolata');
  ok(await p.isVisible('.hph >> text=28\''), 'durata totale mostrata (28\')');
  for (const m of ['intervalli', 'fisso', 'ripetizioni', 'personalizzato']) {
    await p.click(`[data-hmet="${m}"]`); await p.waitForTimeout(120);
    ok(await p.evaluate(m => HM.draft.circuito.metodo === m && HC.durations(HM.draft).circuito > 0, m), 'metodo ' + m + ' selezionabile');
  }
  await p.click('[data-hmet="fisso"]'); await setPar('durata', 20); await setPar('giri', 4);
  ok(await p.evaluate(() => HC.durations(HM.draft).circuito === 1200), 'tempo fisso: 20 minuti esatti');
  await p.click('[data-hmet="personalizzato"]');
  await p.click('[data-hovt="1:rip"]'); await p.waitForTimeout(100);
  await p.fill('[data-hov="1:rip"]', '15'); await p.dispatchEvent('[data-hov="1:rip"]', 'change'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => HC.stationPlan(HM.draft.circuito).st[1].rip === 15), 'personalizzato: ripetizioni per singola stazione');
  if (OUT) await p.screenshot({ path: OUT + '/3-personalizzato.png', fullPage: true });
  await p.click('[data-hmet="tempo"]');

  // salvataggio e gestione schede
  await p.fill('#hName', 'Prova HIFT'); await p.dispatchEvent('#hName', 'change');
  await p.click('#hSave'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => JSON.parse(localStorage.hift_m_plans).length === 1), 'scheda salvata');
  await p.click('[data-htab="schede"]');
  await p.click('[data-pact^="dup:"]'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => HM.plans.length === 2), 'scheda duplicata');
  await p.click('[data-pact^="ren:"] >> nth=0'); await p.fill('#rnIn', 'Rinominata'); await p.click('#rnOk'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => HM.plans[0].nome === 'Rinominata'), 'scheda rinominata');
  await p.click('[data-pact^="arc:"] >> nth=0'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => HM.plans.filter(x => x.archiviata).length === 1), 'scheda archiviata');
  await p.click('[data-hfilt="archiviate"]');
  await p.click('[data-pact^="del:"]'); await p.click('[data-pact^="del:"]'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => HM.plans.length === 1), 'scheda eliminata (con conferma)');
  if (OUT) { await p.click('[data-hfilt="attive"]'); await p.screenshot({ path: OUT + '/4-schede.png', fullPage: true }); }

  // compatibilità dati: un esercizio sparito dall'archivio blocca l'avvio
  await p.evaluate(() => { HM.draft.circuito.stazioni[4].id = 'SPARITO'; saveDraft(); });
  await p.click('[data-htab="prog"]'); await p.waitForTimeout(100);
  ok(await p.isDisabled('#hStart'), 'esercizio inesistente: avvio bloccato');
  await p.click('[data-hswap="circ:4"]'); await p.waitForTimeout(100);
  ok(await p.isEnabled('#hStart'), 'dopo il cambio la scheda è avviabile');

  // player: struttura, timer, recupero del tempo in secondo piano
  await p.click('#hStart'); await p.waitForTimeout(300);
  const segs = await p.evaluate(() => PL.segs.map(s => ({ k: s.kind, d: s.dur, b: s.block, t: s.type })));
  const coreWork = segs.filter(s => s.b === 'Core' && s.k === 'work');
  ok(coreWork.length === 12 && coreWork.every(s => s.d === 30), 'player: 12 intervalli CORE da 30"');
  ok(segs.filter(s => s.b === 'Core' && s.k === 'rest').every(s => s.d === 30), 'player: recuperi CORE da 30"');
  const timed = await p.evaluate(() => PL.segs.filter(s => s.kind !== 'prep').reduce((a, s) => a + s.dur, 0) === HC.durations(HM.draft).totale);
  ok(timed, 'player: somma dei tempi = durata mostrata nella scheda');
  ok(await p.isVisible('.kind >> text=Core'), 'player: distretto visibile');
  if (OUT) await p.screenshot({ path: OUT + '/5-player.png' });
  // simula 100" passati con l'app in secondo piano: 10" prep + 30 + 30 + 30 → a 0" dall'inizio del 2° lavoro più 0"
  await p.evaluate(() => { PL.t0 -= 100000; }); await p.waitForTimeout(400);
  const pos = await p.evaluate(() => ({ i: PL.i, e: el() }));
  ok(pos.i === 4 && pos.e >= 0 && pos.e < 2, 'timer: il tempo trascorso in background non si perde (seg ' + pos.i + ', ' + pos.e.toFixed(1) + 's)');
  await p.click('#pPlay'); const e1 = await p.evaluate(() => el()); await p.waitForTimeout(600);
  ok(Math.abs(await p.evaluate(() => el()) - e1) < 0.05, 'pausa: il tempo è fermo');
  await p.click('#pPlay');
  await p.evaluate(() => PL.segs.length);
  for (let i = 0; i < 400; i++) { if (!(await p.$('#pNext'))) break; await p.click('#pNext'); }
  await p.click('[data-rpe="7"]'); await p.click('#fSave'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => HM.plans[0].completamenti.length === 1 && HM.log.length === 1), 'fine allenamento: scheda completata e storico aggiornato');
  ok(await p.evaluate(() => state.hist[0].fmt === 'HIFT'), 'fine allenamento: voce nel diario');

  // WOD originale ancora funzionante
  await p.evaluate(() => go('oggi')); await p.waitForTimeout(200);
  await p.click('#go'); await p.waitForTimeout(200);
  ok(await p.isVisible('.pl'), 'player WOD originale ok');
  for (let i = 0; i < 300; i++) { if (!(await p.$('#pNext'))) break; await p.click('#pNext'); }
  await p.click('#fSkip'); await p.waitForTimeout(200);
  for (const r of ['esercizi', 'diario', 'profilo', 'metodo']) { await p.evaluate(r => location.hash = r, r); await p.waitForTimeout(200); }
  if (OUT) { await p.evaluate(() => location.hash = 'diario'); await p.waitForTimeout(200); await p.screenshot({ path: OUT + '/6-diario.png' }); }
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  ok(!overflow, 'nessuno scorrimento orizzontale a 390px');
  ok(!errs.length, 'nessun errore JavaScript' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fails ? fails + ' FALLITI' : 'TUTTI I TEST E2E SUPERATI');
  process.exit(fails ? 1 : 0);
})();
