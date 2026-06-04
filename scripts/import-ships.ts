/**
 * CLI ship importer.
 *
 *   npm run import -- [outputFolder]      (defaults to "output")
 *   npm run import -- virtuoso            (uses InfiniteWorkshop/virtuoso/output)
 *   tsx scripts/import-ships.ts output
 *   tsx scripts/import-ships.ts virtuoso
 *
 * The special alias "virtuoso" resolves to ../InfiniteWorkshop/virtuoso/output
 * (gravity-telemetry and InfiniteWorkshop share the same parent directory).
 * Any other value is resolved relative to the current working directory, so an
 * absolute path or a plain relative path both work too.
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

// Resolve the special "virtuoso" alias to the sibling InfiniteWorkshop output.
function resolveOutputFolder(arg: string): string {
  if (arg === "virtuoso") {
    // gravity-telemetry and InfiniteWorkshop share the same parent directory.
    return path.resolve(__dirname, "../../InfiniteWorkshop/virtuoso/output");
  }
  return path.resolve(process.cwd(), arg);
}

async function main() {
  const arg = process.argv[2] ?? "output";
  const root = resolveOutputFolder(arg);
  const jsonPath = path.join(root, "json", "ships.json");
  const imagesDir = path.join(root, "ships");
  const publicShipsDir = path.resolve(process.cwd(), "public", "ships");

  if (!fs.existsSync(jsonPath)) {
    console.error(
      `Could not find ${jsonPath}.\n` +
      `Pass the path to the output folder, e.g.:\n` +
      `  npm run import -- output          (local output/ folder)\n` +
      `  npm run import -- virtuoso        (InfiniteWorkshop/virtuoso/output)\n` +
      `  npm run import -- /absolute/path`
    );
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
    const { unknownFields, ...stats } = result;
    console.log("Import complete:", stats);
    const unknownContextCount = Object.keys(unknownFields).length;
    if (unknownContextCount > 0) {
      const fieldCount = Object.values(unknownFields).reduce((n, f) => n + Object.keys(f).length, 0);
      console.warn(`\nWARNING: ${fieldCount} unrecognized field(s) across ${unknownContextCount} object type(s) — see details above.`);
      console.warn("  Add DB columns + update the KNOWN-KEY constants in lib/importer.ts to capture this data.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
