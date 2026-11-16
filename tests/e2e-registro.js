/* Test end-to-end del registro dell'allenamento (Playwright).
   Avvio: python3 -m http.server 8765 (dalla cartella dell'app), poi  node tests/e2e-registro.js [cartella-screenshot] */
const { chromium } = require('playwright');
const URL = process.env.HIFT_URL || 'http://localhost:8765/index.html';
const OUT = process.argv[2] || null;
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.click('#obNext'); await p.click('[data-one="goal"][data-v="forza"]'); await p.click('#obNext');
  await p.click('[data-many="eq"][data-v="kettlebell"]'); await p.click('[data-many="eq"][data-v="manubri"]');
  await p.click('#obNext'); await p.click('[data-ok]'); await p.click('#obNext'); await p.waitForTimeout(400);

  // ---------- seduta di un programma: registrazione dal vivo nel timer ----------
  await p.evaluate(() => go('crea')); await p.waitForTimeout(900);
  await p.evaluate(() => { const q = PGM.proposta({ obiettivo: 'forza', livello: 2, giorni: 3, settimane: 4 }, crCatalog().filter(c => c.ok)); const e = q.giorni[0].esercizi[0]; e.serie = 3; e.kg = 20; e.rec = 90; CR.list.unshift(q); saveProgs(); startPlayer(crSource(q, 0, 0)); });
  await p.waitForTimeout(300);
  await p.click('#pNext'); await p.waitForTimeout(150); // fine preparazione
  ok(await p.isVisible('[data-live="kg"]') && await p.isVisible('[data-live="rip"]'), 'timer: campi kg e ripetizioni sotto "Serie fatta"');
  ok(await p.getAttribute('[data-live="kg"]', 'placeholder') === '20', 'timer: il carico previsto è suggerito');
  await p.fill('[data-live="kg"]', '22,5'); await p.fill('[data-live="rip"]', '6');
  if (OUT) await p.screenshot({ path: OUT + '/r1-timer.png' });
  await p.click('#setDone'); await p.waitForTimeout(2600);
  ok(await p.evaluate(() => PL.segs[PL.i].kind === 'rest'), 'dopo la serie parte il recupero');
  await p.click('#pNext'); await p.waitForTimeout(150);
  ok(await p.getAttribute('[data-live="kg"]', 'placeholder') === '22,5', 'serie successiva: suggerito il carico della serie precedente');
  await p.fill('[data-live="rip"]', '5'); await p.click('#setDone'); await p.waitForTimeout(200);
  const live = await p.evaluate(() => PL.L[0].sets.slice(0, 2));
  ok(live[0].kg === 22.5 && live[0].rip === 6 && live[0].rec >= 2 && live[0].rec <= 4, 'serie 1: 22,5 kg × 6, recupero misurato ' + live[0].rec + '"');
  ok(live[1].rip === 5 && live[1].kg == null, 'serie 2: salvato solo ciò che hai scritto');
  for (let i = 0; i < 300; i++) { if (!(await p.$('#pNext'))) break; await p.click('#pNext'); }

  // ---------- fine allenamento: tabella serie per serie ----------
  ok(await p.isVisible('#fPr .lgt'), 'fine allenamento: tabella del registro');
  ok(await p.inputValue('[data-lg="0:0:kg"]') === '22,5' && await p.inputValue('[data-lg="0:1:rip"]') === '5', 'la tabella contiene le serie registrate dal vivo');
  ok(await p.evaluate(() => document.querySelectorAll('[data-lg^="0:"][data-lg$=":kg"]').length) === 3, 'una riga per ogni serie prevista (3)');
  await p.fill('[data-lg="0:2:kg"]', '22,5'); await p.fill('[data-lg="0:2:rip"]', '5');
  await p.click('[data-lgcp="1"]'); await p.waitForTimeout(100);
  const cp = await p.evaluate(() => PL.L[1]);
  ok(cp.sets.length >= cp.n - 1 && cp.sets.slice(0, cp.n).every(s => s.rip != null || s.sec != null), '"Come previsto" compila il secondo esercizio');
  await p.click('[data-lgadd="1"]'); await p.waitForTimeout(80);
  const n1 = await p.evaluate(() => PL.L[1].n);
  await p.click(`[data-lgdel="1:${n1 - 1}"]`); await p.waitForTimeout(80);
  ok(await p.evaluate(n => PL.L[1].n === n - 1, n1), 'aggiungi e togli una serie');
  if (OUT) await p.screenshot({ path: OUT + '/r2-registro.png', fullPage: true });
  await p.click('[data-rpe="8"]'); await p.click('#fSave'); await p.waitForTimeout(400);
  const h0 = await p.evaluate(() => state.hist[0]);
  ok(h0.fmt === 'PROGRAMMA' && h0.log && h0.log[0].sets.length === 3 && h0.log[0].sets[2].kg === 22.5, 'registro salvato nella voce del Diario');
  ok(await p.evaluate(k => PROG.entries.some(e => e.k === k && e.kg === 22.5 && e.serie === 3), h0.log[0].k), 'Progressi: serie più pesante e numero di serie dal registro');

  // ---------- Diario: riepilogo, dettaglio, modifica ----------
  await p.evaluate(() => { state.dtab = 'sessioni'; go('diario'); }); await p.waitForTimeout(250);
  ok(/serie/.test(await p.innerText('.hrow .lgsum')) && /kg sollevati/.test(await p.innerText('.hrow .lgsum')), 'Diario: riepilogo del registro nella riga (' + await p.innerText('.hrow .lgsum') + ')');
  await p.click('[data-hi="0"]'); await p.waitForTimeout(200);
  ok(await p.isVisible('#sheet >> text=22,5 kg × 6 rip'), 'dettaglio: serie per serie');
  await p.click('#hsLog'); await p.waitForTimeout(200);
  await p.fill('[data-lg="0:1:kg"]', '22,5'); await p.click('#lgSave'); await p.waitForTimeout(250);
  ok(await p.evaluate(() => state.hist[0].log[0].sets[1].kg === 22.5), 'registro modificato dal Diario');

  // ---------- allenamento libero ----------
  await p.click('#dLib'); await p.waitForTimeout(300);
  await p.fill('[data-lf="title"]', 'Palestra sotto casa'); await p.fill('[data-lf="min"]', '45');
  await p.click('#lgAddEx'); await p.waitForTimeout(150);
  await p.fill('#lgQ', 'swing'); await p.waitForTimeout(150); await p.click('#sheet [data-lgpk] >> nth=0'); await p.waitForTimeout(150);
  for (let i = 0; i < 3; i++) { await p.fill(`[data-lg="0:${i}:kg"]`, '16'); await p.fill(`[data-lg="0:${i}:rip"]`, '15'); if (i < 2) await p.fill(`[data-lg="0:${i}:rec"]`, '60'); }
  await p.click('[data-lrpe="7"]');
  if (OUT) await p.screenshot({ path: OUT + '/r3-libero.png', fullPage: true });
  await p.click('#lgSave'); await p.waitForTimeout(300);
  const lib = await p.evaluate(() => state.hist.find(h => h.fmt === 'LIBERO'));
  ok(lib && lib.title === 'Palestra sotto casa' && lib.min === 45 && lib.log[0].sets.length === 3 && /720 kg sollevati/.test(lib.res), 'allenamento libero salvato: ' + (lib && lib.res));
  ok(await p.evaluate(() => AN.disciplina(state.hist.find(h => h.fmt === 'LIBERO')) === 'libero'), 'analisi: disciplina "Allenamento libero"');

  // ---------- voce senza registro (WOD già salvato): aggiunta ----------
  await p.evaluate(() => { state.hist.push({ date: new Date(Date.now() - 2 * 864e5).toISOString(), title: 'Vecchio WOD', min: 30, rpe: 7, fmt: 'AMRAP', fmtLabel: 'AMRAP', ids: ['jumpingjack', 'kbswing', 'pushup', 'forwardfold'] }); store.set('hist', state.hist); renderDiary(); });
  const iOld = await p.evaluate(() => state.hist.findIndex(h => h.title === 'Vecchio WOD'));
  await p.click(`[data-hi="${iOld}"]`); await p.waitForTimeout(200);
  ok(/Aggiungi pesi, ripetizioni e serie/i.test(await p.innerText('#hsLog')), 'voce senza registro: si può aggiungere');
  await p.click('#hsLog'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => [...document.querySelectorAll('#lgEd .nm')].map(x => x.textContent).join()) === 'Jumping jack,Kettlebell swing,Push-up', 'esercizi ricavati dalla sessione (senza stretching)');
  await p.fill('[data-lg="1:0:kg"]', '16'); await p.fill('[data-lg="1:0:rip"]', '20'); await p.click('#lgSave'); await p.waitForTimeout(250);
  ok(await p.evaluate(() => { const h = state.hist.find(h => h.title === 'Vecchio WOD'); return h.log.length === 1 && h.log[0].sets[0].kg === 16; }), 'registro aggiunto alla vecchia voce');

  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  ok(!overflow, 'nessuno scorrimento orizzontale a 390px');
  ok(!errs.length, 'nessun errore JavaScript' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fails ? fails + ' FALLITI' : 'TUTTI I TEST REGISTRO SUPERATI');
  process.exit(fails ? 1 : 0);
})();
