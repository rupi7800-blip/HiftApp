/* =========================================================
   tools/estrai-atlanti.js — costruisce l'archivio esercizi di HIFT App
   a partire dai sei "Atlante … 100" (modulo esterno, in archivio/sorgenti/).

   Non inventa esercizi: legge i dati che ogni atlante contiene (numero,
   categoria, livello, nome, esecuzione, progressione, illustrazione) eseguendo
   il codice dati della pagina in una VM senza DOM. L'attrezzatura si ricava
   dalla categoria dell'atlante e dagli attrezzi disegnati; i casi in cui serve
   il testo sono elencati qui sotto con il motivo.

   Uso:  node tools/estrai-atlanti.js
   Scrive: archivio-esercizi.json e archivio/img/<ID>.svg
   ========================================================= */
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'archivio', 'sorgenti');
const IMG = path.join(ROOT, 'archivio', 'img');

const ATLANTI = [
  { k: 'core', file: 'atlante-core.html', pref: 'CORE', distretto: 'Core', hift: 'core', url: 'https://claude.ai/artifact/WWSbveH43XNKFgLGVMLnUj' },
  { k: 'petto', file: 'atlante-petto.html', pref: 'PET', distretto: 'Petto', hift: 'petto', url: 'https://claude.ai/artifact/Tnz955xdYyonF7jawEnC6Y' },
  { k: 'quadricipiti', file: 'atlante-quadricipiti.html', pref: 'QUA', distretto: 'Quadricipiti', hift: 'quadricipiti', url: 'https://claude.ai/artifact/88jQkeYo4sDuG4mUX2EbY8' },
  { k: 'spalle', file: 'atlante-spalle.html', pref: 'SPA', distretto: 'Spalle', hift: 'spalle', url: 'https://claude.ai/artifact/D3tppThDYuMqj3wSCf4V11' },
  { k: 'glutei', file: 'atlante-glutei.html', pref: 'GLU', distretto: 'Glutei', hift: 'glutei', url: 'https://claude.ai/artifact/RCCncpg7EJah2RQthtTjWo' },
  { k: 'dorso', file: 'atlante-dorso.html', pref: 'DOR', distretto: 'Dorso', hift: 'dorso', url: 'https://claude.ai/artifact/RmpXnCdsVJ8A8JP3zpf7oU' }
];

/* nomi degli attrezzi: senza virgole, "/", "+" o " o " (sono separatori nel formato dell'archivio) */
const ATTREZZI = {
  'Corpo libero': 'nessun attrezzo',
  'Powerbag': 'sacca con maniglie (power bag)',
  'Med ball': 'palla medica',
  'TRX': 'cinghie in sospensione (TRX o anelli) con un ancoraggio stabile',
  'Rialzo': 'box, panca, gradino o sedia robusta',
  'Tavolo robusto': 'tavolo stabile o appoggio solido sotto cui sdraiarsi',
  'Muro': 'parete libera',
  'Parallele': 'parallele, due sedie robuste o blocchi',
  'Slider': 'dischi scivolanti o asciugamano su pavimento liscio',
  'Appoggio per i piedi': 'un mobile o un compagno che blocchi i talloni',
  'Elastici': 'banda elastica ancorata',
  'Cavo': 'macchina a cavi',
  'Fitball': 'palla svizzera',
  'Ab wheel': 'ruota per addominali',
  'Kettlebell': '',
  'Manubri': '',
  'Bilanciere': 'anche in landmine',
  'Sbarra': 'sbarra per trazioni',
  'Roman chair': 'panca per iperestensioni',
  'Slitta': 'slitta da spinta',
  'Sandbag': 'sacco zavorrato',
  'Compagno': 'un partner di allenamento'
};

/* --- attrezzatura dei 5 atlanti di distretto ---
   A, B = corpo libero · C = powerbag · D = med ball · E = TRX (struttura dichiarata dagli atlanti)
   + accessori disegnati: bench → rialzo (o tavolo / appoggio, vedi sotto), wall/wallT → muro,
     bar (petto 33) → parallele, slider → slider */
const MAIN = { A: 'Corpo libero', B: 'Corpo libero', C: 'Powerbag', D: 'Med ball', E: 'TRX' };
const TEXT_ONLY = {
  // muro necessario ma non disegnato
  'spalle:18': ['Muro'],      // Wall slide: "Schiena, testa e avambracci al muro"
  'petto:70': ['Muro'],       // Lancio laterale di petto: "Di fianco al muro"
  'spalle:73': ['Muro'],      // Lancio dalla spalla a un braccio: "Di fianco al muro"
  'petto:48': ['Muro | Compagno'] // Chest pass con sacca: "verso un partner o un muro robusto"
};
function districtEq(at, x) {
  const req = [MAIN[x.c]];
  const types = new Set(x.pr.map(q => q[0]));
  const txt = (x.name + ' ' + x.d).toLowerCase();
  if (types.has('bench')) {
    if (at === 'dorso' && (/tavolo/.test(txt) || x.n === 27 || x.n === 35)) req.push('Tavolo robusto'); // rematore inverso sotto il tavolo / sul bordo
    else if (at === 'glutei' && (x.n === 22 || x.n === 23)) req.push('Appoggio per i piedi'); // nordic: talloni bloccati
    else req.push('Rialzo');
  }
  if (types.has('wall') || types.has('wallT')) req.push('Muro');
  if (types.has('bar') && at === 'petto') req.push('Parallele');
  if (types.has('slider')) req.push('Slider');
  (TEXT_ONLY[at + ':' + x.n] || []).forEach(r => req.push(r));
  return [...new Set(req)].filter((r, i, a) => !(r === 'Corpo libero' && a.length > 1));
}

/* --- attrezzatura dell'atlante Core: organizzato per funzione, quindi esercizio per esercizio
   (attrezzi disegnati + testo; "banda o cavo" e "un peso" sono alternative come dice l'atlante) */
const EL = 'Elastici | Cavo', KM = 'Kettlebell | Manubri';
const CORE_EQ = {
  6: ['Muro'], 13: ['Elastici'], 14: ['Fitball'], 21: ['Rialzo'], 22: ['Fitball'], 23: ['Slider'],
  29: ['Ab wheel'], 30: ['Ab wheel'], 31: ['Fitball'], 32: ['TRX'],
  38: ['Rialzo'], 39: ['Rialzo'], 40: ['Rialzo'], 41: [EL],
  42: ['Kettlebell'], 43: ['Kettlebell'], 44: ['Kettlebell'], 45: ['Manubri'], 46: [KM],
  47: ['Roman chair | Rialzo'], 48: [KM],
  52: [EL], 53: [EL], 54: [EL], 55: [EL], 56: [EL], 57: [EL],
  58: ['Manubri'], 59: ['Kettlebell'], 60: ['Bilanciere'], 61: [EL], 62: [EL], 63: [EL], 64: [EL],
  65: ['Rialzo', 'Manubri'], 66: ['Compagno'], 67: [EL],
  73: ['Roman chair'], 74: ['Roman chair | Rialzo'], 76: ['Rialzo', 'Manubri'], 77: ['Elastici'],
  78: ['Kettlebell'], 79: ['Bilanciere | Sandbag'], 80: [KM],
  81: ['Fitball'], 82: ['Fitball'], 83: ['Slider'], 84: ['Sbarra'], 86: ['Parallele'], 87: ['Elastici'], 88: ['Elastici'],
  89: ['Kettlebell'], 90: [KM], 91: ['Compagno | Elastici'], 92: ['Kettlebell'], 93: ['Kettlebell'], 94: ['Kettlebell'],
  95: ['Rialzo', KM], 97: ['Slitta'], 98: ['Fitball'], 99: ['Med ball', 'Compagno'], 100: [EL]
};

/* --- illustrazioni: stesse figure dell'atlante, colori del tema scuro di HIFT App --- */
const SVG_STYLE = '<defs><marker id="ah" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#7FD6FF"/></marker></defs>' +
  '<style>.n{stroke:#F3F1EA}.f{stroke:#77776D}.hn{fill:#22231C;stroke:#F3F1EA}.floor{stroke:rgba(243,241,234,.2)}.pr{fill:#3E3F36;stroke:none}' +
  '.ac{stroke:#7FD6FF;fill:none}.acf{fill:#7FD6FF}.ball{fill:rgba(127,214,255,.18);stroke:#7FD6FF}.wt{fill:#FF5B3A;stroke:#FF5B3A}</style>';
function standaloneSvg(svg) {
  return svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ').replace(/(<svg[^>]*>)/, '$1' + SVG_STYLE);
}

function load(file) {
  const html = fs.readFileSync(path.join(SRC, file), 'utf8');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  const js = scripts[scripts.length - 1];
  const cut = js.indexOf('const main=document');
  if (cut < 0) throw new Error(file + ': struttura dati non riconosciuta');
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(js.slice(0, cut) + '\n;globalThis.__R={CATS,LV,X,fig};', ctx, { timeout: 3000 });
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || file;
  const eyebrow = (html.match(/<div class="eyebrow">([^<]*)<\/div>/) || [])[1] || '';
  return Object.assign({ title, eyebrow }, ctx.__R);
}
const sentences = t => String(t).split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý])/).map(s => s.trim()).filter(Boolean);
const pad = n => String(n).padStart(3, '0');

function build() {
  if (!fs.existsSync(IMG)) fs.mkdirSync(IMG, { recursive: true });
  const esercizi = [], fonti = [], problemi = [];
  for (const A of ATLANTI) {
    const R = load(A.file);
    if (R.X.length !== 100) problemi.push(A.title + ': ' + R.X.length + ' esercizi invece di 100');
    fonti.push({ atlante: R.title, sottotitolo: R.eyebrow, artifact: A.url, esercizi: R.X.length });
    const byNum = new Map(R.X.map(x => [x.n, x]));
    for (const x of R.X) {
      const id = A.pref + '-' + pad(x.n);
      const att = A.k === 'core' ? (CORE_EQ[x.n] || ['Corpo libero']) : districtEq(A.k, x);
      // riferimenti espliciti "(n. 98)" nella progressione → collegamento tra esercizi dello stesso atlante
      const refs = [...String(x.p).matchAll(/n\.\s*(\d{1,3})/g)].map(m => +m[1]).filter(n => byNum.has(n)).map(n => A.pref + '-' + pad(n));
      fs.writeFileSync(path.join(IMG, id + '.svg'), standaloneSvg(R.fig(JSON.parse(JSON.stringify(x)))));
      const fr = sentences(x.d);
      esercizi.push({
        id,
        nome: x.name,
        distretto: A.distretto,
        hift: A.hift,
        categoria: R.CATS[x.c].t,
        attrezzatura: att,
        descrizione: fr[0] || x.d,
        esecuzione: fr,
        immagine: 'archivio/img/' + id + '.svg',
        livello: x.l,
        varianti: refs,
        progressioni: [x.p],
        fonte: R.title + ' n. ' + x.n
      });
    }
  }
  const out = {
    _info: 'Archivio esercizi di HIFT App generato da tools/estrai-atlanti.js a partire dagli Atlanti 100 (non modificare a mano: rigenera).',
    versione: new Date().toISOString().slice(0, 10),
    fonti,
    attrezzi: ATTREZZI,
    esercizi
  };
  fs.writeFileSync(path.join(ROOT, 'archivio-esercizi.json'), JSON.stringify(out, null, 1) + '\n');
  return { n: esercizi.length, problemi, esercizi };
}

if (require.main === module) {
  const r = build();
  const cnt = {};
  r.esercizi.forEach(e => e.attrezzatura.forEach(a => { cnt[a] = (cnt[a] || 0) + 1; }));
  console.log(r.n + ' esercizi scritti in archivio-esercizi.json; illustrazioni in archivio/img/');
  console.log('Attrezzatura:', Object.entries(cnt).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v).join(' · '));
  if (r.problemi.length) { console.log('PROBLEMI:\n- ' + r.problemi.join('\n- ')); process.exitCode = 1; }
}
module.exports = { build, load, ATTREZZI };
