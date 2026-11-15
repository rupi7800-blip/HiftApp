# Archivio esercizi esterno — integrazione con HIFT Method

La sezione **HIFT Method** non contiene esercizi. Li legge dall'archivio prodotto dal modulo esterno (l'altra sezione AI).
Finché l'archivio non è collegato la sezione mostra **"Archivio esercizi non collegato"** e non genera allenamenti.

La libreria interna della scheda *Esercizi* (45 esercizi con figure animate) resta com'era e continua a servire il generatore WOD di *Oggi*. Non viene usata dal metodo HIFT e non viene sovrascritta.

## Archivio attuale: Atlanti 100 (integrato il 15/11/2026)

`archivio-esercizi.json` contiene i **600 esercizi** dei sei atlanti prodotti dal modulo esterno. Ogni esercizio è collegato al suo atlante tramite il campo `fonte` (ad esempio "Atlante Petto 100 n. 61"):

| Atlante | ID | Sezione HIFT | Categorie |
|---------|----|--------------|-----------|
| Atlante Core 100 | `CORE-001…100` | CORE | per funzione: fondamenta, anti-estensione, anti-flessione laterale, anti-rotazione, catena posteriore, flessione d'anca, integrati |
| Atlante Petto 100 | `PET-001…100` | Stazione 1 | 1–35 corpo libero · 36–55 powerbag · 56–75 med ball · 76–100 TRX |
| Atlante Quadricipiti 100 | `QUA-001…100` | Stazione 2 | come sopra |
| Atlante Spalle 100 | `SPA-001…100` | Stazione 3 | come sopra |
| Atlante Glutei 100 | `GLU-001…100` | Stazione 4 | come sopra |
| Atlante Dorso 100 | `DOR-001…100` | Stazione 5 | come sopra |

**Come è stato costruito.** `node tools/estrai-atlanti.js` legge le pagine degli atlanti (copie in `archivio/sorgenti/`) eseguendo solo il loro codice dati, senza interfaccia, e scrive il JSON e le 600 illustrazioni in `archivio/img/`. Le illustrazioni sono le stesse figure degli atlanti, ricolorate per il tema scuro dell'app. Nome, livello, esecuzione e progressione sono copiati senza modifiche, e un test verifica che corrispondano all'atlante, numero per numero. Se un atlante cambia, si aggiorna la sua copia in `archivio/sorgenti/` e si rilancia lo script.

**Attrezzatura.** Gli atlanti non hanno un campo "attrezzatura", quindi lo script la ricava così:

- **atlanti dei distretti:** dalla categoria (A–B corpo libero, C powerbag, D med ball, E TRX) più gli attrezzi disegnati nell'illustrazione: rialzo, tavolo robusto (rematori sotto il tavolo), muro, parallele, slider, appoggio per i piedi (nordic). Quattro esercizi richiedono il muro solo nel testo e sono elencati nello script (`TEXT_ONLY`);
- **atlante Core:** esercizio per esercizio, dagli attrezzi disegnati e dal testo (tabella `CORE_EQ` nello script). Quando l'atlante dice "banda o cavo", oppure "un peso" disegnato come kettlebell, le due voci diventano alternative (`Elastici | Cavo`, `Kettlebell | Manubri`).

Attrezzi presenti: Corpo libero, TRX, Med ball, Powerbag, Rialzo, Muro, Elastici, Cavo, Kettlebell, Manubri, Tavolo robusto, Fitball, Compagno, Slider, Roman chair, Ab wheel, Bilanciere, Parallele, Appoggio per i piedi, Sbarra, Sandbag, Slitta. La descrizione di ognuno è nel campo `attrezzi` del JSON e si vede nelle impostazioni del metodo.

**Da sapere.**

- Tre nomi compaiono due volte: "Squeeze press da sdraiato" (con powerbag e con med ball), "Squat con fermo in basso" (a corpo libero e al TRX) e "Bear crawl" (nel Core e nelle Spalle). L'app li tratta come varianti dello stesso esercizio, quindi non finiscono mai insieme nella stessa scheda.
- "Marcia in ponte" (GLU-075) è nella categoria Med ball dell'atlante ma il testo dice che la palla è facoltativa: segue la categoria dell'atlante e richiede la med ball.
- Le progressioni degli atlanti sono testo libero. Dove citano un altro esercizio con "(n. 98)", lo script crea il collegamento tra i due.

## Come collegare l'archivio (in ordine di priorità)

| # | Modalità | Quando usarla |
|---|----------|---------------|
| 1 | `window.HiftArchiveProvider = async () => dati` | il modulo esterno espone un'API, un database o altro: la funzione restituisce i dati |
| 2 | `window.HIFT_ARCHIVIO = dati` | il modulo è un file JS che definisce i dati |
| 3 | file `archivio-esercizi.json` nella cartella dell'app | il modulo fornisce un file JSON |
| 4 | Importa archivio (JSON) nella sezione HIFT | prova rapida dal telefono: il file resta solo in quel browser |

Per le modalità 1 e 2 il modulo va incluso in `index.html` **prima** di `hift-method-core.js`:

```html
<script src="modulo-archivio.js"></script>
<script src="hift-method-core.js"></script>
```

Il service worker scarica `archivio-esercizi.json` prima dalla rete e usa la copia salvata solo offline. Un archivio aggiornato quindi arriva subito.

## Formato dei dati

I dati possono essere un array di esercizi oppure un oggetto con `esercizi` (sono accettati anche `exercises`, `items` e `data`), o ancora un oggetto indicizzato per ID. Per ogni esercizio:

| Campo | Obbligatorio | Nomi accettati | Note |
|-------|--------------|----------------|------|
| ID univoco | sì | `id`, `codice`, `code` | i duplicati vengono ignorati (si tiene la prima voce) e segnalati |
| Nome | sì | `nome`, `name` | |
| Attrezzatura necessaria | sì | `attrezzatura`, `equipment`, `attrezzi` | array o testo. Ogni voce è un requisito; `"Kettlebell \| Manubri"` o `"kettlebell o manubri"` indicano alternative. `"corpo libero"` (o `bodyweight`) significa nessun attrezzo |
| Distretto muscolare | sì per HIFT | `distretto`, `muscoli`, `muscle`, `target` | il **primo** distretto è quello principale |
| Categoria | | `categoria`, `category` | se è "Core" vale come distretto |
| Sezione HIFT esplicita | | `hift`, `sezione`, `slot` | es. `"core"` o `["petto"]`: ha la precedenza sul distretto |
| Descrizione | | `descrizione`, `description` | |
| Modalità di esecuzione | | `esecuzione`, `istruzioni`, `instructions` | array o testo su più righe |
| Immagine | | `immagine`, `image`, `media.immagine` | URL https o percorso relativo; `javascript:` e simili vengono scartati |
| Video | | `video`, `media.video` | i file mp4/webm vengono riprodotti nell'app, gli altri link si aprono in una nuova finestra |
| Livello | | `livello`, `level`, `difficolta` | 1–3, scale numeriche più ampie (riportate su 1–3) oppure principiante/intermedio/avanzato |
| Varianti, regressioni, progressioni | | `varianti`, `regressioni`, `progressioni` | ID o nomi di altri esercizi. Servono anche a evitare due varianti dello stesso esercizio nella stessa scheda |

Distretti riconosciuti: **core** (core, addome, addominali, obliqui, trasverso), **petto** (petto, pettorali, chest), **quadricipiti**, **spalle** (spalle, deltoidi), **glutei**, **dorso** (dorso, dorsali, gran dorsale, romboidi, upper back, lats).

Esempio:

```json
{ "esercizi": [
  { "id": "EX-001", "nome": "…", "distretto": ["Petto", "Tricipiti"], "categoria": "Spinta",
    "attrezzatura": ["corpo libero"], "livello": 1, "descrizione": "…",
    "esecuzione": ["…", "…"], "immagine": "img/ex-001.jpg", "regressioni": ["EX-002"] }
]}
```

## Controlli all'importazione

Ogni volta che legge l'archivio, l'app mostra in **HIFT → Archivio esercizi → Dettagli**:

- il numero di esercizi validi per CORE e per ciascuna delle 5 stazioni;
- le voci scartate perché incomplete (manca l'ID, il nome o l'attrezzatura);
- gli ID duplicati;
- gli esercizi senza un distretto utilizzabile;
- gli esercizi senza livello;
- i nomi ripetuti con ID diversi.

L'app non modifica mai l'archivio e non ne crea una copia parallela. L'importazione da file salva solo una copia locale del file scelto, che si può rimuovere in qualsiasi momento.

Le schede salvate contengono solo gli **ID** degli esercizi. Se un ID non esiste più nell'archivio, la scheda lo segnala e non si avvia finché l'esercizio non viene sostituito.

## Test

```bash
node --test tests/*.test.js                      # logica del metodo e archivio reale (29 test)
python3 -m http.server 8765 & node tests/e2e.js  # browser (48 controlli, richiede Playwright)
```

`tests/fixtures/archivio-test.json` è un archivio **di sola prova** per i casi limite con nomi fittizi ("Test core A"…). Non viene mai caricato dall'app.
