# Registro dell'allenamento

Ogni allenamento ha un **registro serie per serie**: carico (kg), ripetizioni, tempo, recupero e numero di serie. Il registro resta nella voce del Diario.
Funziona sempre, anche con la funzione Progressi disattivata. Con Progressi attiva, il registro alimenta anche l'adattamento dei prossimi allenamenti.

## Dove si compila

| Momento | Come |
|---------|------|
| **Durante l'allenamento** | Nelle serie che si confermano con "Serie fatta" (programmi di Crea, blocco di forza del WOD, stazioni a ripetizioni di HIFT) compaiono i campi **Kg** e **Rip fatte**. Il suggerimento in grigio è il carico della serie precedente o quello previsto. **I recuperi vengono misurati dal timer**, anche se li accorci con "avanti". Nelle serie a tempo vengono misurati anche i secondi di lavoro |
| **A fine allenamento** | Tabella "Registro dell'allenamento": una riga per ogni serie prevista, già compilata con ciò che hai segnato dal vivo e con i recuperi misurati. I valori in grigio sono quelli previsti. "Come previsto" riempie i campi vuoti con quei valori; "+ Serie" e "×" aggiungono o tolgono righe. Con Progressi attiva c'è anche la sensazione (facile, giusto, duro) per esercizio |
| **Dal Diario** | Apri una voce: vedi le serie e il riepilogo, puoi **modificare il registro**. Per le sessioni salvate prima, senza registro, "Aggiungi pesi, ripetizioni e serie" propone gli esercizi di quella sessione (riscaldamento e stretching esclusi) |
| **Allenamento libero** | Diario → "+ Allenamento libero": per allenamenti fatti fuori dall'app. Nome, data, durata, esercizi scelti dalla libreria WOD o dall'archivio HIFT, serie, RPE e nota |

Si salva solo ciò che scrivi o misura il timer: i valori previsti restano suggerimenti finché non li confermi con "Come previsto". Il carico accetta sia la virgola sia il punto (22,5 o 22.5).

## Cosa si vede

- **Riga del Diario:** esercizi, serie, ripetizioni, **kg sollevati** (somma di carico × ripetizioni) e recupero medio.
- **Dettaglio della voce:** ogni esercizio con le sue serie, ad esempio "22,5 kg × 6 rip rec 120"".
- **Diario → Analisi:** l'allenamento libero è una disciplina a sé nella famiglia "Allenamento funzionale". Il MET è quello dell'allenamento con i pesi, secondo l'RPE.
- **Progressi:** per ogni esercizio il registro produce una misura con la serie più pesante (carico e ripetizioni), il numero di serie e il recupero medio. Le modifiche fatte dopo nel Diario aggiornano il registro, non i progressi già calcolati.

## Formato dei dati

Nella voce del Diario (`localStorage`, chiave `hift_hist`), campo `log`:

```json
[{ "k": "w:kbswing", "nome": "Kettlebell swing", "f": { "kg": true, "rip": true, "sec": false },
   "plan": { "serie": 3, "rip": 15, "kg": 16, "rec": 60 },
   "sets": [{ "kg": 16, "rip": 15, "rec": 60 }, { "kg": 16, "rip": 15, "rec": 58 }, { "kg": 16, "rip": 14 }],
   "esito": "giusto" }]
```

## Codice e test

- `registro-core.js`;
- `tests/registro.test.js`;
- `tests/e2e-registro.js`.
