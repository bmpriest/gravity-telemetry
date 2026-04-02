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

Feel free to use the ship data, which can be found in [`/data/ships.ts`](./data/ships.ts). It is out of date and I will be moving towards a database solution, but will attempt to keep a copy for easy export.

To quickly convert the data to JSON, you can copy the array object and run `JSON.stringify(<data>)` in your browser console.

Each ship follows the data structures in their type declarations in [`/utils/ships.ts`](./utils/ships.ts).

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
