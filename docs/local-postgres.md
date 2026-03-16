# Local PostgreSQL Setup

PaperTrade expects PostgreSQL to be available on `localhost:5432` with a database named `papertrade`.

## Option 1: Postgres.app on macOS
1. Install and open Postgres.app.
2. Start the default server.
3. Create the database:
   - `createdb papertrade`
4. Update [backend/.env.example](/Users/aaryankattel/Downloads/fyp/backend/.env.example) values in your local `backend/.env`.

## Option 2: Homebrew PostgreSQL
1. Install PostgreSQL:
   - `brew install postgresql`
2. Start the service:
   - `brew services start postgresql`
3. Create the database:
   - `createdb papertrade`

## Option 3: Existing Local PostgreSQL
1. Make sure the server is running on port `5432`.
2. Create a `papertrade` database if it does not exist.
3. Set `PGUSER`, `PGPASSWORD`, and other values in `backend/.env`.

## After PostgreSQL Is Running
From the `backend` folder:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

Then from the `frontend` folder:

```bash
npm start
```
