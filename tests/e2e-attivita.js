/* Test end-to-end di attività e analisi (Playwright).
   Avvio: python3 -m http.server 8765 (dalla cartella dell'app), poi  node tests/e2e-attivita.js [cartella-screenshot] */
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
  for (let i = 0; i < 3; i++) await p.click('#obNext');
  await p.click('[data-ok]'); await p.click('#obNext'); await p.waitForTimeout(400);
  const kg = await p.evaluate(() => state.P.weight);

  // ---------- corsa registrata dalla Home ----------
  await p.click('#toAtt'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => [...document.querySelectorAll('[data-aat]')].map(b => b.textContent).join()) === 'Corsa,Camminata,Bicicletta,Nuoto,Stretching,Pilates,Yoga', 'sette attività disponibili');
  await p.fill('[data-af="min"]', '50'); await p.fill('[data-af="dist"]', '10'); await p.fill('[data-af="fc"]', '150'); await p.click('[data-arpe="7"]');
  ok(/11,7 MET/.test(await p.innerText('#atPrev')), 'anteprima: MET dalla velocità (12 km/h → 11,7)');
  if (OUT) await p.screenshot({ path: OUT + '/a1-attivita.png', fullPage: true });
  await p.click('#atSave'); await p.waitForTimeout(250);
  const run = await p.evaluate(() => state.hist[0]);
  ok(run.att === 'corsa' && run.min === 50 && run.dist === 10 && /5'00"\/km/.test(run.res) && /FC 150/.test(run.res), 'corsa salvata con passo e FC');
  ok(run.res.includes('~' + Math.round(11.7 * kg * 50 / 60) + ' kcal'), 'calorie: MET × peso × ore (' + run.res + ')');

  // ---------- yoga di qualche giorno fa e nuoto, dal Diario ----------
  await p.evaluate(() => go('diario')); await p.waitForTimeout(200);
  await p.click('#dAtt'); await p.click('[data-aat="yoga"]'); await p.click('[data-ayo="hatha"]');
  await p.fill('[data-af="min"]', '60');
  const d3 = await p.evaluate(() => { const d = new Date(Date.now() - 3 * 864e5); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); });
  await p.fill('[data-af="date"]', d3); await p.click('#atSave'); await p.waitForTimeout(200);
  await p.click('#dAtt'); await p.click('[data-aat="nuoto"]'); await p.click('[data-asty="rana"]');
  await p.fill('[data-af="min"]', '30'); await p.fill('[data-af="dist"]', '1500'); await p.click('#atSave'); await p.waitForTimeout(200);
  ok(await p.evaluate(d3 => state.hist.some(h => h.att === 'yoga' && h.yoga === 'hatha' && h.date.slice(0, 10) <= d3) && state.hist.some(h => h.att === 'nuoto' && h.stile === 'rana' && h.dist === 1500), d3), 'yoga (data passata) e nuoto salvati');

  // ---------- bici dal vivo con il cronometro ----------
  await p.click('#dAtt'); await p.click('[data-aat="bici"]'); await p.click('#atLive'); await p.waitForTimeout(300);
  ok(await p.isVisible('#setDone'), 'cronometro avviato');
  await p.evaluate(() => { PL.t0 -= 20 * 60000; }); await p.waitForTimeout(200);
  await p.click('#setDone'); await p.waitForTimeout(300);
  ok(await p.isVisible('#faBox [data-af="dist"]'), 'fine attività: si inseriscono distanza e dati');
  ok(!(await p.$('#fPr')), 'le attività non hanno il registro delle serie né toccano i progressi di forza');
  await p.fill('#faBox [data-af="dist"]', '8'); await p.click('[data-rpe="6"]'); await p.click('#fSave'); await p.waitForTimeout(300);
  const bike = await p.evaluate(() => state.hist[0]);
  ok(bike.att === 'bici' && bike.min === 20 && bike.dist === 8 && /24 km\/h/.test(bike.res), 'bici dal vivo: 20 minuti cronometrati, 24 km/h');

  // dati per l'analisi: un WOD, una seconda corsa, progressi di un esercizio
  await p.evaluate(() => {
    state.hist.push({ date: new Date(Date.now() - 10 * 864e5).toISOString(), title: 'WOD', min: 35, rpe: 8, fmt: 'AMRAP', fmtLabel: 'AMRAP 20\'', ids: [] });
    state.hist.push(AN.voce({ att: 'corsa', min: 40, dist: 7, date: new Date(Date.now() - 12 * 864e5).toISOString(), peso: 75 }));
    state.hist.sort((a, b) => b.date.localeCompare(a.date)); store.set('hist', state.hist);
    [[20, 12], [14, 14], [7, 15], [1, 16]].forEach(([d, r]) => PR.addEntries(PROG, [{ k: 'w:squat', nome: 'Air squat', rip: r, d: new Date(Date.now() - d * 864e5).toISOString() }]));
    saveProg(); state.dtab = 'analisi'; renderDiary();
  });
  await p.waitForTimeout(300);

  // ---------- analisi ----------
  const tot = await p.evaluate(() => state.hist.reduce((a, h) => a + h.min, 0));
  const shown = await p.evaluate(() => document.querySelector('.an4 .stat .v').textContent.replace(/\D/g, ''));
  ok(+shown === tot, 'minuti totali del periodo: ' + shown + ' (somma ' + tot + ')');
  ok(await p.evaluate(() => document.querySelectorAll('.legend span').length) >= 5, 'legenda delle discipline');
  ok(await p.evaluate(() => document.querySelectorAll('.chart svg').length) >= 3, 'grafici: minuti per settimana, progressi esercizio, velocità di corsa');
  const disc = await p.evaluate(() => [...document.querySelectorAll('.bl')].map(r => r.innerText.replace(/\s+/g, ' ')));
  ok(disc.some(t => /^Yoga 60'/.test(t)) && disc.some(t => /^Corsa 90'/.test(t) && /17 km/.test(t)), 'minuti parziali per disciplina: ' + disc.slice(0, 3).join(' | '));
  await p.click('.chart rect[data-tt]:last-of-type'); await p.waitForTimeout(150);
  const tip = await p.evaluate(() => { const t = document.querySelector('.chart .tt'); return t.classList.contains('hide') ? '' : t.innerText; });
  ok(/minuti/.test(tip) && /Corsa|Bicicletta|Nuoto/.test(tip), 'tooltip sulla settimana: ' + tip.replace(/\n/g, ' · '));
  await p.click('#anTab'); await p.waitForTimeout(150);
  ok(await p.isVisible('.sumt thead'), 'vista tabella dei minuti');
  ok(/MET-ore/i.test(await p.innerText('#view')) && /OMS/.test(await p.innerText('#view')), 'MET-ore e obiettivo OMS della settimana');
  if (OUT) await p.screenshot({ path: OUT + '/a2-analisi.png', fullPage: true });
  await p.click('[data-anp="Infinity"]'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => state.anP === Infinity), 'periodo: tutto');

  // ---------- dettaglio ed eliminazione dal diario ----------
  await p.click('[data-dtab="sessioni"]'); await p.waitForTimeout(150);
  const n0 = await p.evaluate(() => state.hist.length);
  await p.click('[data-hi="0"]'); await p.waitForTimeout(150);
  ok(await p.isVisible('#sheet >> text=Kcal stimate'), 'dettaglio della voce: minuti, calorie, MET');
  await p.click('#hsDel'); await p.click('#hsDel'); await p.waitForTimeout(200);
  ok(await p.evaluate(n => state.hist.length === n - 1, n0), 'voce eliminata (con conferma)');
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  ok(!overflow, 'nessuno scorrimento orizzontale a 390px');
  ok(!errs.length, 'nessun errore JavaScript' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fails ? fails + ' FALLITI' : 'TUTTI I TEST ATTIVITÀ E ANALISI SUPERATI');
  process.exit(fails ? 1 : 0);
})();
