# Crea — programmi di allenamento personali

Sezione **Crea** nella barra in basso. Crei un programma completo scegliendo:

- gli esercizi, dalla libreria WOD o dai 600 esercizi illustrati dell'archivio HIFT;
- per ogni esercizio carico (kg o % del massimale), ripetizioni (minimo–massimo) o tempo, serie, recupero e ripetizioni in riserva (RIR);
- i giorni della settimana, la durata (da 1 a 52 settimane), la data di inizio, il modello di progressione e le settimane di scarico.

La logica è in `programma-core.js`, testata da `tests/programma.test.js` e `tests/e2e-crea.js`.

## Come si usa

1. **Nuovo programma:** nome, obiettivo, livello, giorni e durata (da 4 settimane a 6 mesi). Puoi partire da una **proposta automatica**, costruita su obiettivo, livello, giorni e la tua attrezzatura, oppure da un programma vuoto.
2. **Struttura:**
   - obiettivo, con la tabella delle linee guida che vengono applicate;
   - livello, giorni, durata, inizio e ora per il calendario;
   - modello di progressione e scarico.
3. **Esercizi:** una seduta per giorno. Per ogni esercizio:
   - imposti serie, ripetizioni o tempo, carico, % del massimale, recupero, RIR e note;
   - puoi spostarlo, eliminarlo o aprirne la scheda;
   - sotto trovi le serie settimanali per gruppo muscolare a confronto con quelle consigliate.
4. **Controllo:** verifica automatica delle regole (vedi sotto).
5. **Calendario:** tutte le settimane con date, fase (carico, scarico, accumulo…), carichi e ripetizioni già calcolati, sedute fatte e pulsante **Allena**.
6. **Esporta:** vedi i formati più sotto.

**Allena** avvia la seduta nel timer dell'app:

- ogni serie è una tappa: "Serie fatta" per quelle a ripetizioni, conto alla rovescia per quelle a tempo;
- i recuperi partono da soli;
- a fine seduta puoi registrare i progressi, la seduta va nel Diario e viene segnata come fatta nel programma.

## Regole scientifiche applicate

| Obiettivo | Ripetizioni | Serie/esercizio | Recupero | Intensità | Serie/settimana per muscolo | Progressione |
|-----------|-------------|-----------------|----------|-----------|-----------------------------|--------------|
| Forza | 3–6 (corpo libero 6–10) | 3–6 | 2–5' | 80–90% 1RM, RIR 1–3 | 8–16 | +2,5%/sett. |
| Ipertrofia | 6–12 | 3–5 | 1–2' | 65–80%, RIR 0–3 | 10–20 | +2%/sett. |
| Potenza | 1–5 esplosive | 3–5 | 2–5' | 30–70%, RIR 2–4 | 6–12 | +2%/sett. |
| Resistenza muscolare | 12–25 | 2–4 | 30–60" | 40–65%, RIR 1–3 | 8–16 | +1,5%/sett. |
| Dimagrimento | 10–15 | 2–4 | 30–75" | 60–75%, RIR 1–3 | 10–18 | +1,5%/sett. |
| Salute e benessere | 8–15 | 1–3 | 1–2' | 50–70%, RIR 2–4 | 4–12 | +1%/sett. |

Fonti: ACSM Position Stand 2009 sulla progressione nell'allenamento di forza; NSCA, *Essentials of Strength Training and Conditioning*; Schoenfeld et al. 2016 sulla frequenza e 2017 sulla relazione volume–ipertrofia. Gli esercizi di core usano 8–12 ripetizioni (o tenute) con qualsiasi obiettivo.

**Il controllo segnala:**

- **struttura:** giorni senza esercizi, due giorni nello stesso giorno della settimana, sedute con più di 10 esercizi, durata stimata oltre i 90';
- **recupero:** nessun giorno di riposo; meno di 48 ore tra due sedute intense sugli stessi gruppi muscolari;
- **livello:** più di 4 sedute a settimana per un principiante;
- **volume:** serie settimanali per gruppo sotto la dose efficace o oltre quella recuperabile (i muscoli secondari contano a metà), gruppi non allenati, tutto il volume concentrato in un solo giorno;
- **equilibrio:** molta più spinta che trazione;
- **intensità:** ripetizioni, serie, recuperi o % del massimale lontani dall'obiettivo; in potenza, serie troppo vicine al cedimento;
- **ordine:** il core prima degli esercizi principali;
- **periodizzazione:** oltre 6 settimane senza scarico, scarico troppo frequente, programmi più corti di 4 settimane.

**Progressione:**

- **lineare:** il carico cresce ogni settimana secondo l'obiettivo, al massimo del 10% a settimana; senza carico crescono ripetizioni o tempo;
- **ondulata:** nella settimana i giorni alternano pesante (−2 ripetizioni, +5% di carico), medio e leggero (+2 ripetizioni, −8%);
- **a blocchi:** accumulo (40% delle settimane: +1 serie, +2 ripetizioni, −8%), trasformazione (35%), realizzazione (25%: −1 serie, −2 ripetizioni, +6%, RIR −1);
- **scarico:** serie al 60%, carico al 90%, RIR +2. Le settimane di scarico non contano nella progressione, che riprende dal livello raggiunto.

**Carichi in percentuale:** se registri un progresso con carico e ripetizioni, l'app stima il massimale (formula di Epley) e calcola i kg di ogni settimana dalla percentuale indicata.

## Formati di esportazione

| Formato | Uso |
|---------|-----|
| Stampa / PDF | pagina impaginata con caselle da spuntare; dalla finestra di stampa si sceglie "Salva come PDF" |
| CSV | Excel, Fogli Google, Numbers: separatore `;` e codifica UTF-8 con BOM, una riga per esercizio di ogni seduta |
| Excel (.xls) | cartella di lavoro (SpreadsheetML) con il foglio Programma e il foglio Info |
| Calendario (.ics) | ogni seduta come evento con ora, durata stimata ed esercizi nella descrizione (RFC 5545) |
| HTML | pagina da aprire in qualsiasi browser |
| Markdown | Notion, Obsidian, GitHub |
| Testo | da leggere o incollare in un messaggio |
| JSON | copia completa: si reimporta con "Importa da file" anche su un altro dispositivo |

Ogni formato si può scaricare o, dove il telefono lo permette, **condividere**. Tutte le esportazioni contengono le settimane con progressione e scarichi già calcolati.

## Dati

I programmi sono salvati solo nel browser (`localStorage`, chiave `hift_progs`). "Cancella tutti i dati" nel Profilo elimina anche i programmi.
