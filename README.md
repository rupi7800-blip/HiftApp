<p align="center"><img src="icons/logo.png" alt="Hift" width="420"></p>

# Hift App

Web app per allenamenti funzionali ad alta intensità (HIFT).

- Genera sessioni in base a obiettivo, livello, dati fisici, attrezzatura e zone da proteggere
- Formati WOD: AMRAP, EMOM, Tabata, intervalli, For Time, più blocchi di forza e potenza
- Player con timer, segnali sonori e contagiri: lista della sessione sempre visibile e anteprima del prossimo esercizio
- Esercizi su due lati contati per lato, con indicazione del lato da eseguire
- Musica: tracce Hift Beats generate dall'app o brani dal proprio dispositivo
- Diario con RPE e note
- Libreria di 45 esercizi con figure animate, istruzioni, errori comuni e link a video gratuiti (Pexels, Pixabay, Wikimedia Commons)

App installabile (PWA): si aggiunge alla schermata Home, si apre a tutto schermo e funziona anche offline. Nessuna dipendenza; i dati restano nel browser (localStorage).

- `index.html` — l'app
- `manifest.json`, `sw.js` — installazione e offline
- `aggiornamenti.js`, `version.json` — tasto Aggiorna quando esce una nuova versione
- `icons/` — logo e icone

Per pubblicarla: Settings → Pages → Deploy from a branch → `main` / root.
