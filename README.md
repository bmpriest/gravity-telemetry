> \[IMPORTANT\]
>
> This project is a refactor of DubNubz' original Gravity Assist in Next.js/React to allow for further development.
>
> You can see the original repo and set it up for yourself [here](https://github.com/kennething/gravity-assist?tab=readme-ov-file#project-setup).

<h1 align="center">
  Gravity Telemetry
</h1>

<p align="center">
  Gravity Telemetry is a tool for Star Hunter: Infinite Lagrange, a game by NetEase. One part information repository, one part strategic planning resource, Gravity Telemetry aims to be a "one-stop shop" for all kinds of information not found or easily obtained in game.
</p>
<p align="center">
  Star Hunter: Infinite Lagrange is a space-themed multiplayer RTS where players can build fleets and attack other players.
</p>

## Ship Data

Feel free to use the ship data. The canonical source now lives in PostgreSQL (managed via the `/admin` UI). A snapshot is kept in [`/prisma/seed-data.ts`](./prisma/seed-data.ts) as the bootstrap source for `npm run db:seed`.

To quickly convert the data to JSON, you can copy the array object and run `JSON.stringify(<data>)` in your browser console.

Each ship follows the data structures in their type declarations in [`/utils/ships.ts`](./utils/ships.ts).

## Project Setup

### With Docker (recommended)

1. Copy `.env.example` to `.env` and edit as needed (database credentials, admin user, etc.).
2. Build and start:

```sh
docker compose up --build
```

The first launch will run the Postgres migrations, seed ship data (when `RUN_SEED=true`), and create an admin user from `ADMIN_USERNAME`/`ADMIN_PASSWORD`. The admin will be forced to change their password on first sign-in.

The site runs at http://localhost:3000.

### Running locally

1. Ensure [Node.js](https://nodejs.org/) and PostgreSQL are installed.
2. Create a `.env` file in the root of the project. You can use the `.env.example` to start.
3. Install dependencies, apply migrations, seed ship data, and run the dev server:

```sh
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

The site runs at http://localhost:3000. Sign in as the configured admin to access the `/admin` UI for managing ships, modules, subsystems, attributes, and users.
