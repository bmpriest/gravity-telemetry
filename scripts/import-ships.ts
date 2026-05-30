/**
 * CLI ship importer.
 *
 *   npm run import -- [outputFolder]      (defaults to "output")
 *   tsx scripts/import-ships.ts output
 *
 * Reads <outputFolder>/json/ships.json, copies every image in
 * <outputFolder>/ships into public/ships (overwriting duplicates), then imports
 * the catalogue via lib/importer. Unlike the admin JSON importer, this variant
 * handles the image files for you.
 */

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { importShips } from "@/lib/importer";

async function main() {
  const folder = process.argv[2] ?? "output";
  const root = path.resolve(process.cwd(), folder);
  const jsonPath = path.join(root, "json", "ships.json");
  const imagesDir = path.join(root, "ships");
  const publicShipsDir = path.resolve(process.cwd(), "public", "ships");

  if (!fs.existsSync(jsonPath)) {
    console.error(`Could not find ${jsonPath}. Pass the path to the output folder, e.g. \`npm run import -- output\`.`);
    process.exit(1);
  }

  // Copy images (overwriting). Build the set of available basenames so the
  // importer can repair variant-less img references.
  const available = new Set<string>();
  if (fs.existsSync(imagesDir)) {
    fs.mkdirSync(publicShipsDir, { recursive: true });
    const files = fs.readdirSync(imagesDir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
    for (const f of files) {
      fs.copyFileSync(path.join(imagesDir, f), path.join(publicShipsDir, f));
      available.add(f);
    }
    console.log(`Copied ${files.length} ship images → public/ships`);
  } else {
    console.warn(`No images directory at ${imagesDir} — skipping image copy.`);
  }

  const shipsJson = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

  const prisma = new PrismaClient();
  try {
    console.log("Importing ships…");
    const result = await importShips(prisma, shipsJson, { availableImages: available, log: (m) => console.log("  " + m) });
    console.log("Import complete:", result);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
