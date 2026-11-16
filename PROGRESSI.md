# Progressi — registrazione e adattamento degli allenamenti

Funzione **facoltativa** e **generale**: vale per il WOD di *Oggi* (anche i blocchi di forza e potenza) e per *HIFT Method*.
Si attiva o disattiva in **Profilo → Progressi**. Quando è disattivata i dati già salvati restano, ma gli allenamenti tornano ai valori di base.

## Cosa si registra

| Dove | Come |
|------|------|
| Fine di ogni allenamento | "Registra i progressi · facoltativo": per ogni esercizio carico, ripetizioni, tempo, serie e com'è andata (facile, giusto, duro), più un giudizio sui recuperi della sessione (troppo brevi, giusti, troppo lunghi). Riscaldamento e stretching sono esclusi |
| Diario → Progressi → "+ Registra un progresso" | qualsiasi esercizio della libreria WOD o dell'archivio HIFT, con data, carico, ripetizioni, tempo, serie, recupero, sensazione e nota |
| Scheda di un esercizio (libreria o archivio HIFT) | pulsante "Registra un progresso" e risultato dell'ultima volta |

Tutti i campi sono facoltativi: basta anche solo la sensazione. Anche lo sforzo percepito (RPE) dato a fine allenamento conta.
Per gli esercizi a tempo (plank, tenute) si registrano i secondi, per gli altri le ripetizioni.

## Come vengono elaborati (`progressi-core.js`)

**Per esercizio.** Si parte dal fattore di volume usato l'ultima volta e lo si corregge con la risposta:

- la sensazione: facile → più volume, duro → meno;
- le ripetizioni (o i secondi) fatti rispetto all'obiettivo.

La progressione è quindi cumulativa, entro un limite tra −40% e +80% rispetto alla base. Dopo più di 3 settimane di pausa il vantaggio si riduce della metà, dopo 2 mesi quasi del tutto.

Il **carico suggerito** cresce secondo l'obiettivo:

| Obiettivo | Facile | Giusto | Duro |
|-----------|--------|--------|------|
| Forza | +5% | +2,5% | −5% |
| Potenza | +4% | +2% | −5% |
| Dimagrimento, resistenza, salute | +2,5% | = | −5% |

Il carico non sale se le ripetizioni sono rimaste sotto l'85% dell'obiettivo o dopo una pausa lunga. Gli arrotondamenti sono a 0,5 kg sotto i 10 kg, a 1 kg fino a 40 kg, poi a 2,5 kg.

**Stato generale.** Considera le ultime 6 sessioni degli ultimi 45 giorni, pesando di più le recenti, e confronta RPE e sensazioni con la fascia di sforzo dell'obiettivo (salute 5–7, resistenza 6–8, forza, potenza e dimagrimento 7–9). Ne ricava:

- un fattore di volume tra −25% e +35%, usato per gli esercizi senza dati propri;
- una correzione dei recuperi, tra −20" e +30", dal riscontro sui recuperi e, per dimagrimento e resistenza, dalla densità;
- la proposta di **cambiare livello**: dopo almeno 4 sessioni sentite facili si propone di salire, dopo sessioni molto dure di scendere. La proposta compare in Diario → Progressi e si applica con un tocco.

## Cosa cambia negli allenamenti

**WOD di Oggi:**

- ripetizioni e tenute di AMRAP, EMOM e round sono calibrate su ciascun esercizio;
- i carichi suggeriti vengono dai tuoi risultati;
- il lavoro degli intervalli cambia con obiettivo e recuperi;
- il recupero dei blocchi di forza si allunga o si accorcia (tra 60" e 240");
- il Tabata resta il protocollo standard 20"/10";
- "Perché questa sessione" spiega cosa è stato adattato.

**HIFT Method:**

- il **CORE non cambia**: 3 esercizi, 4 serie, 30" di lavoro e 30" di recupero, come prevede il metodo;
- cambiano i parametri del circuito secondo obiettivo e stato: lavoro, recuperi, giri e ripetizioni. Ogni adattamento ha dei limiti (lavoro e ripetizioni ±25%, recuperi −30%/+40% con un minimo di 10", giri ±1) e i tempi sono arrotondati a 5". Le modifiche sono elencate nella scheda e si possono cambiare a mano;
- nel circuito a ripetizioni ogni stazione usa il fattore del proprio esercizio;
- nella scheda e nel timer compaiono "ultima volta" e il prossimo carico.

Per obiettivo: **forza** e **potenza** fanno crescere il carico e non allungano i tempi di lavoro; **dimagrimento** e **resistenza** aumentano lavoro e giri e accorciano i recuperi; **salute** progredisce più lentamente.

## Dati

Salvati solo nel browser (`localStorage`, chiave `hift_prog`): fino a 3000 misure e 400 sessioni. Ogni misura si può eliminare dalla scheda dell'esercizio, in Diario → Progressi. "Cancella tutti i dati" nel Profilo elimina anche i progressi.

## Test

- `node --test tests/*.test.js`: comprende i test del modulo dei progressi;
- `node tests/e2e-progressi.js`: verifica nel browser registrazione, adattamento del WOD e del metodo HIFT, livello, disattivazione.
