# Attività e analisi

## Attività

Oltre agli allenamenti dell'app (WOD, HIFT Method, programmi) puoi registrare **corsa, camminata, bicicletta, nuoto, stretching, pilates e yoga**.

| Dove | Come |
|------|------|
| Home → "+ Corsa, camminata, bici…" | modulo dell'attività |
| Diario → "+ Aggiungi attività" | modulo dell'attività |
| "Inizia ora con il cronometro" | il timer dell'app cronometra l'attività, pause comprese; a fine attività inserisci distanza e dati |

Dati per ogni attività, tutti facoltativi tranne la durata:

- durata e data;
- distanza: km per corsa, camminata e bici, metri per il nuoto;
- frequenza cardiaca media;
- intensità (leggera, moderata, vigorosa);
- stile di nuoto e tipo di yoga;
- sforzo percepito (RPE) e nota.

Dalla distanza l'app calcola il passo (min/km) o la velocità (km/h).
Ogni voce del Diario si apre con un tocco per vederne il dettaglio, compresi MET e calorie, e si può eliminare.
Le attività non modificano i progressi di forza usati per adattare WOD e programmi.

## Calorie e MET (stime)

Il MET di ogni sessione viene dal **Compendium of Physical Activities** (Ainsworth 2011, Herrmann 2024):

| Disciplina | Da cosa dipende il MET |
|------------|------------------------|
| Corsa | velocità (6,4–19,3 km/h → 6,0–19,8 MET) |
| Camminata | velocità (3,2–8,0 km/h → 2,8–8,3 MET) |
| Bicicletta | velocità (12–33 km/h → 4,0–15,8 MET) |
| Senza distanza | intensità indicata; se manca, la ricava dall'RPE |
| Nuoto | stile e intensità (es. stile libero 5,8 / 8,3 / 9,8; rana 5,3–10,3; farfalla 13,8) |
| Yoga | dolce 2,0 · hatha 2,5 · vinyasa/power 4,0 |
| Stretching | 2,3 |
| Pilates | 3,0 |
| WOD, HIFT | circuit training: 4,3 / 6,0 / 8,0 secondo l'RPE |
| Programmi, allenamento libero | allenamento con i pesi: 3,5 / 5,0 / 6,0 secondo l'RPE |

**Calorie = MET × peso (kg, dal Profilo) × ore.** Sono stime ipotetiche: il valore reale può variare del 20–30%. **MET-minuti = MET × minuti**; in analisi si mostrano anche come MET-ore.

## Analisi (Diario → Analisi)

- **Periodo:** 4 settimane, 3 mesi, 6 mesi, 12 mesi o tutto. Oltre i 6 mesi il grafico passa da settimane a mesi.
- **Totali del periodo:** minuti, sessioni, kcal stimate, MET-ore e media settimanale.
- **Settimana corrente secondo l'OMS 2020:**
  - minuti "moderati equivalenti" (le attività da 3 a 6 MET contano una volta, quelle da 6 MET in su contano doppio, quelle sotto 3 MET non contano) rispetto all'obiettivo di 150–300 minuti;
  - giorni di rinforzo muscolare: WOD, HIFT e programmi, almeno 2 a settimana.
- **Minuti per settimana o mese:** colonne impilate per famiglia (allenamento funzionale, corsa, camminata, bici, nuoto, mente e corpo). Toccando una colonna si vede il dettaglio, e i dati sono disponibili anche in tabella.
- **Minuti per disciplina:** minuti parziali di ognuna delle 11 discipline, con percentuale, sessioni, calorie e distanza.
- **Progressi negli esercizi:** andamento di carico, ripetizioni o tempo per ogni esercizio registrato almeno due volte.
- **Corsa:** andamento della velocità media.

**Grafici:** i colori seguono una palette fissa per famiglia, verificata per contrasto e daltonismo sul fondo scuro dell'app. Le famiglie restano 6 per non superare il limite di serie distinguibili; le singole discipline sono nella lista e nella tabella.

## Codice e test

- `analisi-core.js`: discipline, MET, calorie, aggregazioni, OMS;
- `tests/analisi.test.js`, `tests/e2e-attivita.js`.
