<p align="center"><img src="icons/logo.png" alt="HIFT Lab" width="260"></p>

# HIFT Lab

Web app per allenamenti funzionali ad alta intensità (HIFT).

- Genera sessioni in base a obiettivo, livello, dati fisici, attrezzatura e zone da proteggere
- Formati WOD: AMRAP, EMOM, Tabata, intervalli, For Time, più blocchi di forza e potenza
- Player con timer, segnali sonori e contagiri: lista della sessione sempre visibile e anteprima del prossimo esercizio; si può **saltare un esercizio, tornare all'esercizio precedente o sceglierne uno** dall'elenco (anche toccandolo nella lista laterale). In HIFT Method il timer **si ferma tra il CORE e il circuito** finché non premi "Inizia il circuito"
- Esercizi su due lati contati per lato, con indicazione del lato da eseguire
- Musica: tracce HIFT Lab Beats generate dall'app o brani dal proprio dispositivo
- **HIFT Method**: CORE fisso (3 esercizi × 4 serie, 30" lavoro / 30" recupero) e circuito funzionale su 5 stazioni in ordine fisso (petto, quadricipiti, spalle, glutei, dorso), con 5 metodi configurabili (a tempo, a intervalli, a tempo fisso, a ripetizioni, personalizzato). Gli esercizi vengono dall'archivio esterno: oggi i 600 esercizi illustrati degli Atlanti 100 (vedi `ARCHIVIO.md`) e rispettano attrezzatura, livello, esclusioni e storico. Le schede si possono salvare, modificare, duplicare, rinominare, archiviare ed eliminare
- **Crea**: programmi personali con esercizi, carichi, tempi, serie, ripetizioni, giorni, settimane e mesi, controllo delle regole scientifiche della programmazione, progressione, scarichi, timer ed esportazione in PDF, CSV, Excel, calendario (.ics), HTML, Markdown, testo e JSON (vedi `PROGRAMMA.md`)
- **Progressi** (facoltativi): carichi, ripetizioni, tempi, serie, recuperi e sensazioni registrati a fine allenamento o dal Diario; l'app li elabora e adatta gli allenamenti di tutte le sezioni all'obiettivo (vedi `PROGRESSI.md`)
- **Attività**: corsa, camminata, bicicletta, nuoto, stretching, pilates e yoga, da registrare o cronometrare dal vivo
- **Analisi**: minuti parziali e totali per disciplina, calorie e MET stimati (Compendium of Physical Activities), obiettivo OMS settimanale, grafici di minuti, progressi degli esercizi e velocità di corsa (vedi `ANALISI.md`)
- **Registro dell'allenamento**: pesi, ripetizioni, tempi, recuperi e serie di ogni allenamento, segnati dal vivo nel timer o a fine sessione (recuperi misurati in automatico), modificabili dal Diario; allenamento libero per le sessioni fatte fuori dall'app (vedi `REGISTRO.md`)
- Diario con RPE e note, dettaglio ed eliminazione delle voci
- Marchio **HIFT Lab**: logo e colori (arancio #FA8C1D, grigio #4D4B4C); `tools/logo.py` rigenera logo trasparente e icone dall'originale in `archivio/marchio/`
- Libreria di 45 esercizi con figure animate, istruzioni, errori comuni e link a video gratuiti (Pexels, Pixabay, Wikimedia Commons)

App installabile (PWA): si aggiunge alla schermata Home, si apre a tutto schermo e funziona anche offline. Nessuna dipendenza; i dati restano nel browser (localStorage).

- `index.html` — l'app
- `hift-method-core.js` — logica del metodo HIFT (generatore, metodi, durate, controlli)
- `progressi-core.js`, `PROGRESSI.md` — registrazione ed elaborazione dei progressi
- `programma-core.js`, `PROGRAMMA.md` — programmi personali: regole, calendario, esportazioni
- `analisi-core.js`, `ANALISI.md` — attività, MET, calorie e analisi
- `registro-core.js`, `REGISTRO.md` — registro serie per serie
- `ARCHIVIO.md` — come collegare l'archivio esercizi esterno
- `archivio-esercizi.json`, `archivio/img/` — archivio esercizi con le illustrazioni
- `tools/estrai-atlanti.js` — rigenera l'archivio dagli atlanti
- `tests/` — test automatici (`node --test tests/*.test.js`, `node tests/e2e.js`, `node tests/e2e-progressi.js`, `node tests/e2e-crea.js`, `node tests/e2e-attivita.js`, `node tests/e2e-registro.js`)
- `manifest.json`, `sw.js` — installazione e offline
- `aggiornamenti.js`, `version.json` — tasto Aggiorna quando esce una nuova versione
- `icons/` — logo e icone

Per pubblicarla: Settings → Pages → Deploy from a branch → `main` / root.
