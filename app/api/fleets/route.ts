import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { FleetRow as PrismaFleetRow } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { jsonError, withErrorHandler } from "@/lib/httpError";
import {
  FLEET_ROW_KEYS,
  fleetToWire,
  wireRowToPrisma,
} from "@/lib/fleets";

const instanceSchema = z.object({
  id: z.string().min(1).max(64),
  shipId: z.number().int(),
  variant: z.string().min(1).max(2),
});

const upsertSchema = z.object({
  id: z.string().min(1).optional(), // omit to create
  name: z.string().min(1).max(60),
  maxCommandPoints: z.number().int().min(1).max(10_000),
  rows: z.object({
    front: z.array(instanceSchema),
    middle: z.array(instanceSchema),
    back: z.array(instanceSchema),
    reinforcements: z.array(instanceSchema),
  }),
  carrierLoads: z.record(z.string(), z.array(instanceSchema)),
});

const fleetInclude = {
  instances: { include: { ship: { select: { variant: true } } } },
} as const;

export const GET = withErrorHandler(async () => {
  const sessionUser = await requireUser();
  const fleets = await prisma.fleet.findMany({
    where: { userId: sessionUser.id },
    orderBy: { updatedAt: "desc" },
    include: fleetInclude,
  });
  return NextResponse.json({
    success: true,
    fleets: fleets.map(fleetToWire),
  });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const sessionUser = await requireUser();

  const body: unknown = await req.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid fleet");
  }

  const { id, name, maxCommandPoints, rows, carrierLoads } = parsed.data;

  // Validate that every ship referenced exists.
  const allInstanceIds: string[] = [];
  const allShipIds = new Set<number>();
  for (const key of FLEET_ROW_KEYS) {
    for (const inst of rows[key]) {
      allInstanceIds.push(inst.id);
      allShipIds.add(inst.shipId);
    }
  }
  for (const carrierId of Object.keys(carrierLoads)) {
    for (const inst of carrierLoads[carrierId]) {
      allInstanceIds.push(inst.id);
      allShipIds.add(inst.shipId);
    }
  }
  // Carrier IDs themselves must exist among row instances.
  const rowInstanceIds = new Set(
    FLEET_ROW_KEYS.flatMap((k) => rows[k].map((i) => i.id))
  );
  for (const carrierId of Object.keys(carrierLoads)) {
    if (!rowInstanceIds.has(carrierId)) {
      return jsonError(400, `Carrier instance not in any row: ${carrierId}`);
    }
  }
  if (new Set(allInstanceIds).size !== allInstanceIds.length) {
    return jsonError(400, "Duplicate instance ID in fleet");
  }
  if (allShipIds.size > 0) {
    const found = await prisma.ship.findMany({
      where: { id: { in: Array.from(allShipIds) } },
      select: { id: true },
    });
    if (found.length !== allShipIds.size) {
      return jsonError(400, "One or more ship IDs do not exist");
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    let fleetId: string;
    if (id) {
      const existing = await tx.fleet.findFirst({
        where: { id, userId: sessionUser.id },
      });
      if (existing) {
        await tx.fleet.update({
          where: { id },
          data: { name, maxCommandPoints },
        });
        await tx.fleetShipInstance.deleteMany({ where: { fleetId: id } });
      } else {
        await tx.fleet.create({
          data: { id, userId: sessionUser.id, name, maxCommandPoints },
        });
      }
      fleetId = id;
    } else {
      const fleet = await tx.fleet.create({
        data: { userId: sessionUser.id, name, maxCommandPoints },
      });
      fleetId = fleet.id;
    }

    // Create row instances first (carriers must exist before their carried).
    let position = 0;
    for (const key of FLEET_ROW_KEYS) {
      for (const inst of rows[key]) {
        await tx.fleetShipInstance.create({
          data: {
            id: inst.id,
            fleetId,
            shipId: inst.shipId,
            fleetRow: wireRowToPrisma[key],
            position: position++,
          },
        });
      }
    }
    // Then create carried instances pointing back to their carriers.
    for (const carrierId of Object.keys(carrierLoads)) {
      for (const inst of carrierLoads[carrierId]) {
        await tx.fleetShipInstance.create({
          data: {
            id: inst.id,
            fleetId,
            shipId: inst.shipId,
            fleetRow: PrismaFleetRow.carried,
            carrierInstanceId: carrierId,
            position: position++,
          },
        });
      }
    }

    return tx.fleet.findUniqueOrThrow({
      where: { id: fleetId },
      include: fleetInclude,
    });
  });

  return NextResponse.json({ success: true, fleet: fleetToWire(updated) });
});
