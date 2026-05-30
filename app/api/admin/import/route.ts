/**
 * Admin JSON importer. Accepts the contents of a ships.json (the object keyed by
 * ship id, exactly as produced in output/json/ships.json) and runs the shared
 * importer against the live database.
 *
 * Image files are NOT handled here — the admin must copy them into public/ships
 * manually (the response says as much). Use the CLI (`npm run import -- output`)
 * to import data AND copy images in one step.
 */

import type { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { handle } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { importShips } from "@/lib/importer";

export async function POST(req: NextRequest) {
  return handle(async () => {
    await requireAdmin();
    const body = await req.json();
    const shipsJson = body && typeof body === "object" && "ships" in body ? body.ships : body;
    if (!shipsJson || typeof shipsJson !== "object") {
      throw new Error("Body must be the ships.json object (keyed by ship id) or { ships: {…} }.");
    }

    const result = await importShips(prisma, shipsJson);
    return {
      result,
      note: "Data imported. Ship image files were NOT copied — copy them into public/ships manually, or run `npm run import -- output` from the CLI to import data and images together.",
    };
  });
}
