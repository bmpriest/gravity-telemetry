/**
 * Seed script — imports the ship catalogue from output/json/ships.json (via the
 * shared importer) and bootstraps an admin user from ADMIN_USERNAME /
 * ADMIN_PASSWORD if no admin exists.
 *
 * Image files are NOT copied here (the seed has no notion of the output
 * folder's images). Use `npm run import -- output` to import data AND copy the
 * ship images into public/ships in one step.
 *
 * Idempotent: ships are upserted by gameId so re-running is safe.
 */

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { importShips } from "@/lib/importer";

const prisma = new PrismaClient();

// Where the importable JSON lives. Falls back gracefully if the output folder
// isn't present (e.g. a fresh clone) — the admin importer can be used instead.
const JSON_CANDIDATES = [
  path.resolve(process.cwd(), "output", "json", "ships.json"),
  path.resolve(process.cwd(), "data", "ships.json"),
];

async function seedCatalogue() {
  const jsonPath = JSON_CANDIDATES.find((p) => fs.existsSync(p));
  if (!jsonPath) {
    console.warn("No ships.json found (looked in output/json and data) — skipping catalogue import.");
    return;
  }
  console.log(`Importing ship catalogue from ${jsonPath}…`);
  const shipsJson = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const result = await importShips(prisma, shipsJson, { log: (m) => console.log("  " + m) });
  console.log("  catalogue import complete:", result);
}

async function seedAdmin() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    console.warn("ADMIN_USERNAME or ADMIN_PASSWORD not set — skipping admin bootstrap.");
    return;
  }

  const existingAdmin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (existingAdmin) {
    console.log(`Admin already exists (${existingAdmin.username}), skipping bootstrap.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: { username, passwordHash, role: "ADMIN", mustChangePassword: true },
  });
  console.log(`Bootstrapped admin user "${username}" (mustChangePassword=true).`);
}

async function main() {
  await seedCatalogue();
  await seedAdmin();
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
