# Archivio esercizi esterno — integrazione con HIFT Method

La sezione **HIFT Method** non contiene esercizi. Li legge dall'archivio prodotto dal modulo esterno (l'altra sezione AI).
Finché l'archivio non è collegato la sezione mostra **"Archivio esercizi non collegato"** e non genera allenamenti.

La libreria interna della scheda *Esercizi* (45 esercizi con figure animate) resta com'era e continua a servire il generatore WOD di *Oggi*. Non viene usata dal metodo HIFT e non viene sovrascritta.

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
node --test tests/*.test.js                      # logica del metodo (23 test)
python3 -m http.server 8765 & node tests/e2e.js  # browser (41 controlli, richiede Playwright)
```

`tests/fixtures/archivio-test.json` è un archivio **di sola prova** con nomi fittizi ("Test core A"…). Non viene mai caricato dall'app.
