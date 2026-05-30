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

As of v4.0 the ship catalogue is stored in a normalized PostgreSQL schema
(`Ship → System → Slot → Module → Weapon → TargetPriority`, see
[`prisma/schema.prisma`](./prisma/schema.prisma)) and the canonical source is a
`ships.json` file (an object keyed by ship id).

The rich view model the UI consumes is described in
[`/utils/shipModel.ts`](./utils/shipModel.ts); the trimmed legacy `AllShip`
shape used by the fleet builder and blueprint tracker lives in
[`/utils/ships.ts`](./utils/ships.ts).

### Importing

- **CLI (data + images):** `npm run import -- output` reads
  `output/json/ships.json`, copies every image in `output/ships` into
  `public/ships`, then imports the catalogue.
- **Seed:** `npm run db:seed` imports `output/json/ships.json` (if present) and
  bootstraps the admin user. Images are not copied by the seed.
- **Admin UI:** the Admin → Import tab runs the same importer on an uploaded
  `ships.json`. Image files must be copied into `public/ships` manually when
  importing this way.

Re-imports are idempotent: ships are upserted by their game id.

## Project Setup

If you wish to run the site locally:

1. Ensure [Node.js](https://nodejs.org/) is installed.

2. Create a `.env` file in the root of the project. You can use the .env.example to start!

3. Install dependencies and run locally:

```sh
npm install
npm run dev
```

4. The site should be running on http:\//localhost:3000.
