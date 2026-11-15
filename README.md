<p align="center"><img src="icons/logo.png" alt="Hift" width="420"></p>

# Hift App

Web app per allenamenti funzionali ad alta intensità (HIFT).

- Genera sessioni in base a obiettivo, livello, dati fisici, attrezzatura e zone da proteggere
- Formati WOD: AMRAP, EMOM, Tabata, intervalli, For Time, più blocchi di forza e potenza
- Player con timer, segnali sonori e contagiri: lista della sessione sempre visibile e anteprima del prossimo esercizio
- Esercizi su due lati contati per lato, con indicazione del lato da eseguire
- Musica: tracce Hift Beats generate dall'app o brani dal proprio dispositivo
- **HIFT Method**: CORE fisso (3 esercizi × 4 serie, 30" lavoro / 30" recupero) e circuito funzionale su 5 stazioni in ordine fisso (petto, quadricipiti, spalle, glutei, dorso), con 5 metodi configurabili (a tempo, a intervalli, a tempo fisso, a ripetizioni, personalizzato). Gli esercizi vengono dall'archivio esterno: oggi i 600 esercizi illustrati degli Atlanti 100 (vedi `ARCHIVIO.md`) e rispettano attrezzatura, livello, esclusioni e storico. Le schede si possono salvare, modificare, duplicare, rinominare, archiviare ed eliminare
- Diario con RPE e note
- Libreria di 45 esercizi con figure animate, istruzioni, errori comuni e link a video gratuiti (Pexels, Pixabay, Wikimedia Commons)

App installabile (PWA): si aggiunge alla schermata Home, si apre a tutto schermo e funziona anche offline. Nessuna dipendenza; i dati restano nel browser (localStorage).

- `index.html` — l'app
- `hift-method-core.js` — logica del metodo HIFT (generatore, metodi, durate, controlli)
- `ARCHIVIO.md` — come collegare l'archivio esercizi esterno
- `archivio-esercizi.json`, `archivio/` — archivio degli Atlanti 100 (illustrazioni e copie delle pagine sorgente)
- `tools/estrai-atlanti.js` — rigenera l'archivio dagli atlanti
- `tests/` — test automatici (`node --test tests/*.test.js`, `node tests/e2e.js`)
- `manifest.json`, `sw.js` — installazione e offline
- `aggiornamenti.js`, `version.json` — tasto Aggiorna quando esce una nuova versione
- `icons/` — logo e icone

Per pubblicarla: Settings → Pages → Deploy from a branch → `main` / root.
