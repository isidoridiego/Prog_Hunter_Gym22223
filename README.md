# Hunter Gym — database foundation

Questa fase prepara il database MySQL 8 e i componenti condivisi che saranno
riutilizzati dal backend e dal frontend nelle fasi successive.

## Avvio con Docker

1. Copia `.env.example` in `.env` e sostituisci i placeholder con valori locali.
2. Avvia il database e il seed:

   ```sh
   docker compose up --build
   ```

Il servizio `db` usa MySQL 8, `utf8mb4`, la collation
`utf8mb4_0900_ai_ci`, la porta host `3307` e il volume persistente
`hunter_gym_mysql`. Il servizio `seed` attende l'healthcheck del database,
inizializza le tabelle e inserisce gli account demo in modo idempotente.

Gli account demo sono `AlexHunter`, `MiraBlade` e `LeoRogue`, tutti con password
`HunterGym123!`. Per creare o promuovere un amministratore, valorizza
`ADMIN_USERNAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD` nel file `.env`.

Per fermare i container senza cancellare i dati:

```sh
docker compose down
```

Non usare `docker compose down -v` salvo necessità esplicita di eliminare il
database locale.

## Sviluppo senza Docker

Servono Node.js 20+, npm e MySQL 8. Configura le variabili d'ambiente del
database, quindi esegui:

```sh
cd backend
npm ci
npm run build
npm run db:init
npm run seed
```

Il connettore condiviso è `backend/src/db.ts`; pool, query, execute e
transazioni del backend futuro devono riutilizzarlo.

## Ambito della fase

Sono inclusi schema, cataloghi iniziali, inizializzazione dell'admin, account
demo, connettore MySQL e configurazione Compose per `db` e `seed`. API,
frontend e relativi servizi Docker saranno aggiunti nelle fasi successive.
