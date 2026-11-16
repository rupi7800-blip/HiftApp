/* Test end-to-end: marchio HIFT Lab, navigazione nel timer, stop tra CORE e circuito,
   atlanti nascosti (Playwright).
   Avvio: python3 -m http.server 8765 (dalla cartella dell'app), poi  node tests/e2e-marchio.js [cartella-screenshot] */
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
  await p.click('[data-ok]'); await p.click('#obNext'); await p.waitForTimeout(600);

  // ---------- marchio ----------
  const logo = await p.evaluate(() => { const i = document.querySelector('.top .logo img'); return i && i.complete ? [i.naturalWidth, i.naturalHeight, i.getAttribute('src')] : null; });
  ok(logo && logo[0] > 100 && logo[2] === 'icons/logo.png', 'logo HIFT Lab nell\'intestazione');
  const col = await p.evaluate(() => { const c = getComputedStyle(document.documentElement); return [c.getPropertyValue('--volt').trim(), getComputedStyle(document.body).backgroundColor, getComputedStyle(document.querySelector('#go')).backgroundColor]; });
  ok(col[0].toUpperCase() === '#FA8C1D' && col[2] === 'rgb(250, 140, 29)', 'colore principale: arancio del logo (' + col.join(' · ') + ')');
  ok(col[1] === 'rgb(27, 26, 28)', 'fondo scuro neutro');
  const png = await p.evaluate(async () => { const r = await fetch('icons/logo.png'); const bm = await createImageBitmap(await r.blob()); const c = new OffscreenCanvas(bm.width, bm.height); const x = c.getContext('2d'); x.drawImage(bm, 0, 0); return [x.getImageData(2, 2, 1, 1).data[3], x.getImageData(bm.width / 2 | 0, bm.height - 30, 1, 1).data.join()]; });
  ok(png[0] === 0, 'logo: sfondo trasparente');
  ok(png[1].startsWith('250,140,29'), 'logo: arancio originale conservato (' + png[1] + ')');
  const man = await p.evaluate(async () => (await fetch('manifest.json')).json());
  ok(man.theme_color === '#1B1A1C' && !man.icons.some(i => /svg/.test(i.src)), 'manifest: colori e icone nuove');

  ok(!(await p.$('a.hhome.sct')) && !/TrainingLab/i.test(await p.innerText('#view')), 'nessun collegamento a S.C.T. TrainingLab');
  if (OUT) await p.screenshot({ path: OUT + '/m1-home.png' });

  // ---------- timer: saltare, tornare, scegliere ----------
  await p.click('#go'); await p.waitForTimeout(300);
  const st = await p.evaluate(() => exStarts());
  ok(st.length >= 5, 'esercizi navigabili nella sessione: ' + st.length);
  await p.click('#pxNext'); await p.waitForTimeout(100);
  ok(await p.evaluate(s => PL.i === s[0], st), 'Salta esercizio: va all\'inizio del primo esercizio');
  await p.click('#pxNext'); await p.click('#pxNext'); await p.waitForTimeout(100);
  const i3 = await p.evaluate(() => PL.i);
  ok(i3 === st[2], 'saltati due esercizi');
  await p.click('#pxPrev'); await p.waitForTimeout(100);
  ok(await p.evaluate(s => PL.i === s[1], st), 'Esercizio precedente: torna indietro di un esercizio');
  await p.click('#pxPick'); await p.waitForTimeout(150);
  ok(await p.isVisible('#pj'), 'Scegli: elenco degli esercizi');
  if (OUT) await p.screenshot({ path: OUT + '/m2-scegli.png' });
  const target = st[st.length - 2];
  await p.click(`[data-pj="${target}"]`); await p.waitForTimeout(150);
  ok(await p.evaluate(t => PL.i === t && !document.getElementById('pj'), target), 'scelto un esercizio dall\'elenco');
  const wodIt = await p.evaluate(() => { const b = PL.view.find(v => /WOD/.test(v.label)) || PL.view[1]; return { bi: PL.view.indexOf(b), key: b.items[0].key }; });
  await p.click(`[data-jk="${wodIt.bi}|${wodIt.key}"]`); await p.waitForTimeout(150);
  ok(await p.evaluate(w => PL.segs[PL.i].bi === w.bi && (kOf(PL.segs[PL.i]) === w.key || (PL.segs[PL.i].items || []).some(it => it.id === w.key)), wodIt), 'tocco su un esercizio nell\'elenco laterale: ci salta');
  if (OUT) await p.screenshot({ path: OUT + '/m3-timer.png' });
  await p.click('#plX'); await p.click('#plX'); await p.waitForTimeout(200);

  // ---------- HIFT: stop tra CORE e circuito ----------
  await p.evaluate(() => go('metodo')); await p.waitForTimeout(1200);
  await p.click('#hGen'); await p.waitForTimeout(500);
  await p.click('#hStart'); await p.waitForTimeout(300);
  const stop = await p.evaluate(() => PL.segs.findIndex(s => s.label === 'Stop · CORE completato'));
  ok(stop > 0 && await p.evaluate(i => PL.segs[i - 1].block === 'Core' && PL.segs[i + 1].block === 'Circuito' && PL.segs[i].type === 'manual', stop), 'stop tra l\'ultimo recupero del CORE e la prima stazione');
  await p.evaluate(i => { PL.i = i - 1; PL.t0 = performance.now() - 40000; }, stop); await p.waitForTimeout(400);
  ok(await p.evaluate(i => PL.i === i, stop), 'a fine CORE il timer si ferma sullo stop');
  await p.waitForTimeout(1500);
  ok(await p.evaluate(i => PL.i === i, stop) && /Inizia il circuito/i.test(await p.innerText('#setDone')), 'lo stop non riparte da solo: "Inizia il circuito"');
  if (OUT) await p.screenshot({ path: OUT + '/m4-stop.png' });
  await p.click('#setDone'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => PL.segs[PL.i].block === 'Circuito' && PL.segs[PL.i].kind === 'work'), 'si riparte con la prima stazione del circuito');
  await p.click('#plX'); await p.click('#plX'); await p.waitForTimeout(200);

  // ---------- atlanti nascosti ----------
  await p.click('#hArchT'); await p.waitForTimeout(150);
  const arch = await p.innerHTML('#view');
  ok(!/claude\.ai|Atlante/i.test(arch), 'sezione HIFT: nessun atlante né collegamento a Claude');
  ok(await p.evaluate(async () => (await fetch('archivio/sorgenti/atlante-core.html')).status) === 404, 'le pagine degli atlanti non sono pubblicate con l\'app');
  ok(await p.evaluate(async () => !/claude\.ai/.test(await (await fetch('archivio-esercizi.json')).text())), 'archivio esercizi senza collegamenti a Claude');

  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  ok(!overflow, 'nessuno scorrimento orizzontale a 390px');
  ok(!errs.length, 'nessun errore JavaScript' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fails ? fails + ' FALLITI' : 'TUTTI I TEST MARCHIO E NAVIGAZIONE SUPERATI');
  process.exit(fails ? 1 : 0);
})();
