# Impostazioni dell'amministratore

HIFT Lab non ha un server né account: è una web app pubblicata su GitHub Pages e i dati di ogni utente restano nel suo browser. Per questo **l'amministratore è chi gestisce il repository** e le sue impostazioni stanno nel file **`config.json`**.

Ogni volta che si apre, l'app legge `config.json` dalla rete. Senza rete usa l'ultima copia scaricata. Le modifiche valgono per tutti gli utenti dal loro avvio successivo dell'app.

## Collegamento a S.C.T. TrainingLab

```json
{
  "collegamenti": {
    "sct": {
      "attivo": true,
      "nome": "S.C.T. TrainingLab",
      "descrizione": "Training Lab dello Sci Club Taino: lezioni, presenze e allenamenti",
      "url": "https://rupi7800-blip.github.io/SCT-TrainingLab/"
    }
  }
}
```

- **Attivare o disattivare:** `"attivo": true` lo mostra, `"attivo": false` lo nasconde.
- **Dove compare:** nella Home (riquadro sotto HIFT Method) e nel Profilo (sezione Collegamenti). Si apre in una nuova scheda.
- **Indirizzo:** sono accettati solo indirizzi `https://`.

**Come si modifica dal telefono o dal computer:**

1. Su GitHub apri il repository **HiftLab**, poi il file `config.json`.
2. Tocca la matita (*Edit this file*).
3. Cambia `true` in `false` (o viceversa) e premi *Commit changes*.
4. Dopo un minuto circa GitHub Pages pubblica la modifica.

L'indirizzo predefinito è quello standard di GitHub Pages per il repository `SCT-TrainingLab`. Se l'app è pubblicata a un altro indirizzo (ad esempio un dominio personalizzato), basta cambiare `url`.
