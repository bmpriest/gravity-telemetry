/**
 * Fleet API — server-side persistence of saved fleets, available only when
 * logged in. Anonymous browsing keeps using localStorage; on login the client
 * pushes any local fleets here via POST so they migrate to the user's account
 * (see fleetStore.syncWithServer).
 *
 * Schema-side a Fleet is normalized into FleetShipInstance rows with optional
 * carrier nesting via FleetShipInstance.carrierInstanceId. The HTTP shape stays
 * the same nested `Fleet` object the frontend already passes around so the
 * client doesn't need to learn a second representation.
 */

import type { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { handle } from "@/lib/api";
import { requireUser } from "@/lib/session";

interface ShipInstanceDto { id: string; shipId: number; variant: string }
interface FleetDto {
  id: string;
  name: string;
  maxCommandPoints: number;
  rows: {
    front: ShipInstanceDto[];
    middle: ShipInstanceDto[];
    back: ShipInstanceDto[];
    reinforcements: ShipInstanceDto[];
  };
  carrierLoads: Record<string, ShipInstanceDto[]>;
  moduleConfig: Record<string, Record<string, number>>;
}

type DbRow = "Front" | "Middle" | "Back";

interface DbInstance {
  id: string;
  shipId: number;
  variant: string;
  row: DbRow;
  isReinforcement: boolean;
  carrierInstanceId: string | null;
}

function dbRowFor(row: keyof FleetDto["rows"]): DbRow {
  if (row === "front") return "Front";
  if (row === "middle") return "Middle";
  if (row === "back") return "Back";
  // Reinforcements are stored as Front + isReinforcement=true so we don't need
  // a fourth enum value (the schema's ShipRow only has Front/Middle/Back).
  return "Front";
}

function fleetToInstances(fleetId: string, fleet: FleetDto) {
  const out: Array<{
    id: string;
    fleetId: string;
    shipId: number;
    variant: string;
    row: DbRow;
    isReinforcement: boolean;
    carrierInstanceId: string | null;
  }> = [];

  for (const rowKey of ["front", "middle", "back", "reinforcements"] as const) {
    for (const inst of fleet.rows[rowKey] ?? []) {
      out.push({
        id: inst.id,
        fleetId,
        shipId: inst.shipId,
        variant: inst.variant,
        row: dbRowFor(rowKey),
        isReinforcement: rowKey === "reinforcements",
        carrierInstanceId: null,
      });
    }
  }

  for (const [carrierId, loads] of Object.entries(fleet.carrierLoads ?? {})) {
    for (const inst of loads) {
      out.push({
        id: inst.id,
        fleetId,
        shipId: inst.shipId,
        variant: inst.variant,
        row: "Front", // ignored for carried instances; schema needs a value
        isReinforcement: false,
        carrierInstanceId: carrierId,
      });
    }
  }

  return out;
}

function instancesToFleet(
  fleetRow: { id: string; name: string; maxCommandPoints: number; moduleConfig: string | null },
  instances: DbInstance[],
): FleetDto {
  const rows: FleetDto["rows"] = { front: [], middle: [], back: [], reinforcements: [] };
  const carrierLoads: Record<string, ShipInstanceDto[]> = {};

  for (const i of instances) {
    const dto: ShipInstanceDto = { id: i.id, shipId: i.shipId, variant: i.variant };
    if (i.carrierInstanceId) {
      (carrierLoads[i.carrierInstanceId] ??= []).push(dto);
    } else if (i.isReinforcement) {
      rows.reinforcements.push(dto);
    } else if (i.row === "Front") rows.front.push(dto);
    else if (i.row === "Middle") rows.middle.push(dto);
    else rows.back.push(dto);
  }

  let moduleConfig: Record<string, Record<string, number>> = {};
  if (fleetRow.moduleConfig) {
    try {
      moduleConfig = JSON.parse(fleetRow.moduleConfig);
    } catch {
      // invalid config
    }
  }

  return {
    id: fleetRow.id,
    name: fleetRow.name,
    maxCommandPoints: fleetRow.maxCommandPoints,
    rows,
    carrierLoads,
    moduleConfig,
  };
}

async function listFleets(userId: string): Promise<FleetDto[]> {
  const fleets = await prisma.savedFleet.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { instances: true },
  });
  return fleets.map((f) => instancesToFleet(f as any, f.instances as DbInstance[]));
}

export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    return { data: await listFleets(user.id) };
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser();
    const fleet = (await req.json()) as FleetDto;

    if (!fleet?.id || typeof fleet.name !== "string") throw new Error("Invalid fleet payload.");
    if (fleet.name.length > 100) throw new Error("Fleet names can only be 100 characters long.");

    // Make sure the fleet (if it already exists) belongs to this user. Without
    // this check a user could overwrite somebody else's fleet by guessing its id.
    const existing = await prisma.savedFleet.findUnique({ where: { id: fleet.id } });
    if (existing && existing.userId !== user.id) throw new Error("Fleet not found.");

    await prisma.$transaction(async (tx) => {
      const fleetData = {
        name: fleet.name,
        maxCommandPoints: fleet.maxCommandPoints,
        moduleConfig: fleet.moduleConfig ? JSON.stringify(fleet.moduleConfig) : null,
      };

      if (existing) {
        await tx.fleetShipInstance.deleteMany({ where: { fleetId: fleet.id } });
        await tx.savedFleet.update({ where: { id: fleet.id }, data: fleetData });
      } else {
        await tx.savedFleet.create({
          data: {
            id: fleet.id,
            userId: user.id,
            ...fleetData,
          },
        });
      }

      const records = fleetToInstances(fleet.id, fleet);
      // Carrier instances reference parents, so we have to insert root rows
      // first, then carried rows. createMany doesn't enforce ordering but the
      // FK won't be satisfied otherwise.
      const roots = records.filter((r) => r.carrierInstanceId === null);
      const carried = records.filter((r) => r.carrierInstanceId !== null);
      if (roots.length > 0) await tx.fleetShipInstance.createMany({ data: roots });
      if (carried.length > 0) await tx.fleetShipInstance.createMany({ data: carried });
    });

    return { data: await listFleets(user.id) };
  });
}
