# Hunter Gym

Hunter Gym è una web app di allenamento con quest giornaliere, verifiche tra
amici, ranghi, oggetti, profili e combattimenti simulati.

## Stack

- React 18, TypeScript, Vite e React Router nel frontend.
- Node.js, Express 4 e TypeScript nel backend.
- MySQL 8 con sessioni persistite nel database e cookie `httpOnly`.
- Docker Compose per database, seed, API e frontend.

## Struttura finale

```text
.
├── compose.yaml
├── .env.example
├── backend/
│   ├── sql/schema.sql
│   ├── scripts/
│   └── src/
└── frontend/
    ├── public/
    ├── src/
    ├── Dockerfile
    └── nginx.conf
```

## Prerequisiti

- Node.js 20+
- npm
- Docker con Docker Compose
- MySQL 8 solo per l'avvio locale senza Docker

## Configurazione

Copiare `.env.example` in `.env` e sostituire i placeholder:

```sh
cp .env.example .env
```

Variabili principali:

- `MYSQL_ROOT_PASSWORD`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: MySQL.
- `FRONTEND_ORIGIN`: origine CORS del frontend; in locale è `http://localhost:5173`.
- `VITE_API_URL`: URL browser dell'API con prefisso `/api`; in locale è `http://localhost:3000/api`.
- `COOKIE_SECURE=false` per HTTP locale; usare `true` solo con HTTPS.
- `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`: account amministratore opzionale creato o promosso dal seed.

Non aggiungere `.env` reali alla repository. `frontend/.env.example` contiene
la configurazione locale separata del frontend.

## Avvio completo con Docker

```sh
docker compose up --build
```

URL disponibili:

- Frontend: `http://localhost:5173`
- API: `http://localhost:3000/api`
- Salute API: `http://localhost:3000/api/health`

Compose usa il volume persistente `hunter_gym_mysql`, MySQL sulla porta host
`3307` e container `3306`. Il seed attende il database, inizializza lo schema e
aggiunge gli account demo in modo idempotente. L'API attende il completamento
del seed.

Gli account demo sono `AlexHunter`, `MiraBlade` e `LeoRogue`, tutti con password
`HunterGym123!`. I dati del volume persistono fra gli avvii.

Per fermare i container senza cancellare i dati:

```sh
docker compose down
```

`docker compose down -v` elimina anche il volume MySQL e cancella tutti i dati:
usarlo solo consapevolmente.

## Avvio locale separato

Backend:

```sh
cd backend
npm ci
npm run build
npm run db:init
npm run seed
npm run dev
```

Il backend si aspetta MySQL raggiungibile come configurato in `.env`:
per Docker MySQL è raggiungibile tramite host `db:3306`; sulla macchina host la
porta esposta è `3307`.

Frontend:

```sh
cd frontend
cp .env.example .env
npm ci
npm run dev
```

Il frontend usa `VITE_API_URL` durante la build Vite e invia i cookie con
`credentials: 'include'`. Per una build containerizzata, l'argomento Compose
`VITE_API_URL` viene incorporato nell'immagine `web`.

## Prove manuali

- **Auth:** registrazione, login, reload con sessione valida, logout e redirect dopo sessione scaduta.
- **Quest:** completamento di una quest e selezione di un verificatore.
- **Verifiche:** approvazione/rifiuto delle verifiche ricevute.
- **Amici:** ricerca utenti, invio/rifiuto/accettazione richieste e rimozione amicizia.
- **Arena:** avvio battaglia contro un amico e apertura della cronologia/dettaglio.
- **Profilo:** cambio password, item equipaggiato e monarch class.
- **Admin:** accesso solo con ruolo amministratore e assegnazione di premi all'account.

Gli esempi delle richieste REST sono in `backend/api.http`.
