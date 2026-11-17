# Hunter Gym

Web app di allenamento con quest giornaliere, verifica tra amici, ranghi, item
e combattimenti simulati. Questa fase integra l'API Express + TypeScript con la
base MySQL 8 già presente.

## Struttura

```text
hunter-gym/
├── compose.yaml                 # MySQL, seed e API
├── backend/
│   ├── sql/schema.sql           # tabelle e catalogo quest
│   ├── scripts/                 # init-db e seed
│   ├── api.http                 # esempi di richieste REST Client
│   └── src/
│       ├── app.ts               # Express, middleware e rotte
│       ├── db.ts                # pool MySQL condiviso
│       ├── gameConfig.ts        # ranghi, premi e combattimenti
│       ├── middleware/          # autenticazione e controlli admin
│       ├── controllers/         # validazione e risposte HTTP
│       ├── routes/              # endpoint applicativi
│       ├── services/            # query e logica applicativa
│       └── utils/               # risposte e sessioni
```

## Avvio con Docker

1. Copia `.env.example` in `.env` e sostituisci i placeholder con valori locali.
2. Avvia database, seed e API:

   ```sh
   docker compose up --build
   ```

Il servizio `db` usa MySQL 8, `utf8mb4`, la collation
`utf8mb4_0900_ai_ci`, la porta host `3307` e il volume persistente
`hunter_gym_mysql`. Il servizio `seed` attende l'healthcheck del database,
inizializza le tabelle e inserisce gli account demo in modo idempotente. Il
servizio `api` attende il completamento corretto del seed ed espone la porta
`3000`.

Gli account demo sono `AlexHunter`, `MiraBlade` e `LeoRogue`, tutti con password
`HunterGym123!`. Per creare o promuovere un amministratore, valorizza
`ADMIN_USERNAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD` nel file `.env`.

Per fermare i container senza cancellare i dati:

```sh
docker compose down
```

Non usare `docker compose down -v` salvo necessità esplicita di eliminare il
database locale.

## Avvio backend locale

Servono Node.js 20+, npm e MySQL 8. Configura le variabili d'ambiente del
database (`DB_HOST=localhost`, `DB_PORT=3307`), quindi esegui:

```sh
cd backend
npm ci
npm run build
npm run db:init
npm run seed
npm run dev
```

L'API usa `http://localhost:3000/api`. Il connettore condiviso è
`backend/src/db.ts`: servizi e controller lo riutilizzano senza creare pool
aggiuntivi.

## Configurazione

`FRONTEND_ORIGIN` controlla l'origine CORS con credenziali.
`COOKIE_SECURE=true` va usato solo con HTTPS. `PORT` predefinita è `3000`.
Gli account demo sono `AlexHunter`, `MiraBlade` e `LeoRogue`, tutti con password
`HunterGym123!`.

## Endpoint e prove manuali

L'endpoint pubblico `GET /api/health` verifica anche la connessione MySQL e
risponde con l'envelope `success/data`. Registrazione, login, logout e
`GET /api/auth/me` usano sessioni persistite nel database e cookie `httpOnly`;
le rotte protette senza cookie rispondono `401`, mentre le rotte admin
richiedono il ruolo amministratore. Gli esempi completi sono in
`backend/api.http`.

Per fermare i container senza cancellare i dati:

```sh
docker compose down
```

Non usare `docker compose down -v` salvo necessità esplicita di eliminare il
database locale.
