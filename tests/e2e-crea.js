/* Test end-to-end della sezione Crea (Playwright).
   Avvio: python3 -m http.server 8765 (dalla cartella dell'app), poi  node tests/e2e-crea.js [cartella-screenshot] */
const { chromium } = require('playwright');
const fs = require('fs'), os = require('os'), path = require('path');
const URL = process.env.HIFT_URL || 'http://localhost:8765/index.html';
const OUT = process.argv[2] || null;
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', acceptDownloads: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.click('#obNext'); await p.click('#obNext');
  await p.click('[data-many="eq"][data-v="kettlebell"]'); await p.click('[data-many="eq"][data-v="manubri"]');
  await p.click('#obNext'); await p.click('[data-ok]'); await p.click('#obNext'); await p.waitForTimeout(400);

  ok(await p.evaluate(() => document.querySelectorAll('#nav button').length === 6), 'barra in basso: 6 sezioni con Crea');
  await p.click('#nav [data-r="crea"]'); await p.waitForTimeout(900);
  ok(await p.isVisible('#crNew'), 'Crea: pagina iniziale');
  // nuovo programma con proposta automatica
  await p.click('#crNew'); await p.waitForTimeout(150);
  await p.fill('#nwName', 'Forza 3 mesi'); await p.click('[data-nwob="forza"]');
  for (const d of await p.evaluate(() => [...document.querySelectorAll('[data-nwwd].on')].map(x => x.dataset.nwwd))) await p.click(`[data-nwwd="${d}"]`);
  for (const d of ['1', '3', '5']) await p.click(`[data-nwwd="${d}"]`);
  await p.click('[data-nwsw="12"]'); await p.click('#nwProp'); await p.waitForTimeout(400);
  let pr = await p.evaluate(() => crCur());
  ok(pr && pr.nome === 'Forza 3 mesi' && pr.obiettivo === 'forza' && pr.settimane === 12, 'programma creato: forza, 12 settimane');
  ok(pr.giorni.map(g => g.wd).join() === '1,3,5' && pr.giorni.every(g => g.esercizi.length >= 3), 'proposta: 3 giorni (lun, mer, ven) con esercizi');
  ok(await p.evaluate(() => crCur().giorni.flatMap(g => g.esercizi).every(e => { const c = crCatalog().find(x => x.k === e.k); return c && c.ok; })), 'proposta: solo esercizi compatibili con la tua attrezzatura');
  ok(await p.evaluate(() => crCatalog().some(c => c.k.startsWith('h:')) && crCatalog().some(c => c.k.startsWith('w:'))), 'catalogo: libreria WOD + archivio HIFT');
  if (OUT) await p.screenshot({ path: OUT + '/c1-esercizi.png', fullPage: true });

  // modifica: serie, carico, ripetizioni, aggiunta, ordine, eliminazione
  const e0 = pr.giorni[0].esercizi[0].id;
  await p.fill(`[data-cre="${e0}:serie"]`, '5'); await p.dispatchEvent(`[data-cre="${e0}:serie"]`, 'change'); await p.waitForTimeout(100);
  await p.fill(`[data-cre="${e0}:kg"]`, '60'); await p.dispatchEvent(`[data-cre="${e0}:kg"]`, 'change'); await p.waitForTimeout(100);
  ok(await p.evaluate(id => { const e = crCur().giorni[0].esercizi.find(x => x.id === id); return e.serie === 5 && e.kg === 60; }, e0), 'modifica serie e carico');
  const n0 = await p.evaluate(() => crCur().giorni[0].esercizi.length);
  await p.click('#crAddEx'); await p.waitForTimeout(150);
  await p.fill('#pkQ', 'plank'); await p.waitForTimeout(150);
  await p.click('#sheet [data-pk] >> nth=0'); await p.waitForTimeout(200);
  ok(await p.evaluate(n => crCur().giorni[0].esercizi.length === n + 1, n0), 'aggiunto un esercizio dal catalogo');
  await p.evaluate(() => closeSheet());
  const last = await p.evaluate(() => { const g = crCur().giorni[0]; return g.esercizi[g.esercizi.length - 1].id; });
  await p.click(`[data-crmv="${last}:-1"]`); await p.waitForTimeout(100);
  ok(await p.evaluate(id => { const g = crCur().giorni[0]; return g.esercizi[g.esercizi.length - 2].id === id; }, last), 'esercizio spostato');
  await p.click(`[data-crdel="${last}"]`); await p.click(`[data-crdel="${last}"]`); await p.waitForTimeout(100);
  ok(await p.evaluate(n => crCur().giorni[0].esercizi.length === n, n0), 'esercizio eliminato (con conferma)');

  // controllo scientifico: una violazione voluta (due giorni consecutivi pesanti, nessuno scarico)
  await p.click('[data-crtab="struttura"]'); await p.click('[data-crwd="2"]'); await p.click('[data-crsc="0"]'); await p.waitForTimeout(150);
  await p.evaluate(() => { const q = crCur(), g = q.giorni.find(x => x.wd === 2); g.esercizi = JSON.parse(JSON.stringify(q.giorni[0].esercizi)).map(e => Object.assign(e, { id: hid() })); crTouch(q); renderCrea(); });
  await p.click('[data-crtab^="controllo"]'); await p.waitForTimeout(150);
  const txt = await p.innerText('#view');
  ok(/48 ore/.test(txt), 'controllo: segnala due sedute pesanti a 24 ore sugli stessi muscoli');
  ok(/senza scarico/.test(txt), 'controllo: segnala l\'assenza di settimane di scarico');
  if (OUT) await p.screenshot({ path: OUT + '/c2-controllo.png', fullPage: true });
  await p.click('[data-crtab="struttura"]'); await p.click('[data-crwd="2"]'); await p.click('[data-crwd="2"]'); await p.click('[data-crsc="4"]'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => crCur().giorni.length === 3 && crCur().scarico === 4), 'struttura ripristinata: 3 giorni, scarico ogni 4');

  // calendario
  await p.click('[data-crtab="calendario"]'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => document.querySelectorAll('#view details.hcard').length === 12), 'calendario: 12 settimane');
  ok(await p.isVisible('text=Settimana 4 · Scarico'), 'calendario: settimana 4 di scarico');
  const kgs = await p.evaluate(id => PGM.calendario(crCur()).slice(0, 4).map(s => s.giorni[0].esercizi.find(e => e.id === id).kg), e0);
  ok(kgs[0] === 60 && kgs[1] > 60 && kgs[3] < kgs[2], 'calendario: carico in progressione e ridotto nello scarico ' + kgs.join(' → '));

  // esportazioni: file veri scaricati
  await p.click('[data-crtab="esporta"]'); await p.waitForTimeout(150);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hift-exp-'));
  const got = {};
  for (const k of ['csv', 'xls', 'ics', 'html', 'md', 'txt', 'json']) {
    const [d] = await Promise.all([p.waitForEvent('download'), p.click(`[data-crexp="${k}"]`)]);
    const f = path.join(dir, d.suggestedFilename()); await d.saveAs(f); got[k] = fs.readFileSync(f, 'utf8');
    ok(d.suggestedFilename() === 'forza-3-mesi.' + k && got[k].length > 200, 'esportato ' + d.suggestedFilename() + ' (' + got[k].length + ' caratteri)');
  }
  ok(got.csv.startsWith('﻿Settimana;') && got.csv.split('\r\n').length > 100, 'CSV per Excel: intestazione e righe');
  ok(/<Workbook/.test(got.xls) && /ss:Name="Programma"/.test(got.xls), 'Excel: cartella di lavoro con foglio Programma');
  ok((got.ics.match(/BEGIN:VEVENT/g) || []).length === 36 && /DTSTART:\d{8}T180000/.test(got.ics), 'calendario: 36 sedute alle 18:00');
  ok(/^<!doctype html>/.test(got.html) && /Settimana 12/.test(got.html), 'HTML: tutte le settimane');
  ok(/^# Forza 3 mesi/.test(got.md) && /^FORZA 3 MESI/.test(got.txt), 'Markdown e testo');
  await p.click('[data-crexp="pdf"]'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => { const f = document.getElementById('printFrame'); return !!f && /Settimana 12/.test(f.srcdoc); }), 'stampa / PDF: pagina impaginata pronta');

  // import del JSON
  await p.click('#crBack'); await p.waitForTimeout(150);
  await p.setInputFiles('#crImp', path.join(dir, 'forza-3-mesi.json')); await p.waitForTimeout(400);
  ok(await p.evaluate(() => CR.list.length === 2 && CR.list[0].nome === 'Forza 3 mesi' && CR.list[0].id !== CR.list[1].id), 'JSON reimportato come nuovo programma');
  await p.click('#crBack'); await p.waitForTimeout(150);
  await p.click('[data-cract^="del:"] >> nth=0'); await p.click('[data-cract^="del:"] >> nth=0'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => CR.list.length === 1), 'programma eliminato (con conferma)');
  if (OUT) await p.screenshot({ path: OUT + '/c3-lista.png' });

  // allenamento dal programma nel timer
  await p.click('[data-cract^="go:"]'); await p.waitForTimeout(300);
  const seg = await p.evaluate(() => ({ n: PL.segs.length, w: PL.segs.filter(s => s.kind === 'work').length, sets: crCur ? CR.list[0].giorni[0].esercizi.reduce((a, e) => a + e.serie, 0) : 0, man: PL.segs.some(s => s.type === 'manual'), load: PL.segs.some(s => /kg/.test(s.load || '')) }));
  ok(seg.w === seg.sets && seg.man, 'timer: una tappa per ogni serie (' + seg.w + '), "Serie fatta" per le serie a ripetizioni');
  ok(seg.load, 'timer: carico della settimana mostrato');
  if (OUT) await p.screenshot({ path: OUT + '/c4-timer.png' });
  for (let i = 0; i < 300; i++) { if (!(await p.$('#pNext'))) break; await p.click('#pNext'); }
  ok(await p.isVisible('#fPr'), 'fine seduta: registro delle serie');
  await p.click('#fSave'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => CR.list[0].fatte.length === 1 && PGM.prossima(CR.list[0]).i === 1), 'seduta segnata come fatta, la prossima avanza');
  ok(await p.evaluate(() => state.hist[0].fmt === 'PROGRAMMA'), 'seduta nel Diario');
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  ok(!overflow, 'nessuno scorrimento orizzontale a 390px');
  ok(!errs.length, 'nessun errore JavaScript' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fails ? fails + ' FALLITI' : 'TUTTI I TEST CREA SUPERATI');
  process.exit(fails ? 1 : 0);
})();
