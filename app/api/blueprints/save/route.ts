import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { ShipType } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { jsonError, withErrorHandler } from "@/lib/httpError";
import { listAccounts } from "@/lib/blueprints";

const saveSchema = z.object({
  accountIndex: z.number().int().min(0).max(9),
  accountName: z.string().min(1).max(40),
  // null = rename-only (only updates accountName, leaves ships intact)
  ships: z
    .array(
      z.object({
        shipId: z.number().int(),
        techPoints: z.number().int().min(0),
        moduleSystems: z.array(z.string()).optional(),
      })
    )
    .nullable()
    .optional(),
  // Partial map of ShipType -> unassigned tech points
  unassignedTp: z.record(z.string(), z.number().int().min(0)).optional(),
});

const SHIP_TYPES = new Set<string>(Object.values(ShipType));

export const POST = withErrorHandler(async (req: NextRequest) => {
  const sessionUser = await requireUser();

  const body: unknown = await req.json();
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { accountIndex, accountName, ships, unassignedTp } = parsed.data;

  // Validate unassignedTp keys against ShipType enum.
  const cleanedUnassignedTp: Array<{ shipType: ShipType; techPoints: number }> = [];
  if (unassignedTp) {
    for (const [k, v] of Object.entries(unassignedTp)) {
      if (!SHIP_TYPES.has(k)) {
        return jsonError(400, `Unknown ship type: ${k}`);
      }
      cleanedUnassignedTp.push({ shipType: k as ShipType, techPoints: v });
    }
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.blueprintAccount.findUnique({
      where: {
        userId_accountIndex: { userId: sessionUser.id, accountIndex },
      },
    });

    // Rename-only path: existing account, ships not provided.
    if (ships === null || ships === undefined) {
      if (!existing) throw new Error("Account not saved.");
      await tx.blueprintAccount.update({
        where: { id: existing.id },
        data: { accountName },
      });
      return;
    }

    const accountId = existing
      ? (await tx.blueprintAccount.update({
          where: { id: existing.id },
          data: { accountName },
        })).id
      : (await tx.blueprintAccount.create({
          data: {
            userId: sessionUser.id,
            accountIndex,
            accountName,
          },
        })).id;

    // Replace ships: delete child rows then re-create.
    await tx.blueprintShipUnlock.deleteMany({ where: { accountId } });
    await tx.blueprintUnassignedTp.deleteMany({ where: { accountId } });

    for (const ship of ships) {
      const unlock = await tx.blueprintShipUnlock.create({
        data: {
          accountId,
          shipId: ship.shipId,
          techPoints: ship.techPoints,
        },
      });
      if (ship.moduleSystems && ship.moduleSystems.length > 0) {
        // Look up module IDs for this ship by system name.
        const modules = await tx.module.findMany({
          where: { shipId: ship.shipId, system: { in: ship.moduleSystems as never[] } },
          select: { id: true },
        });
        if (modules.length > 0) {
          await tx.blueprintModuleUnlock.createMany({
            data: modules.map((m) => ({
              shipUnlockId: unlock.id,
              moduleId: m.id,
            })),
          });
        }
      }
    }

    if (cleanedUnassignedTp.length > 0) {
      await tx.blueprintUnassignedTp.createMany({
        data: cleanedUnassignedTp.map((u) => ({
          accountId,
          shipType: u.shipType,
          techPoints: u.techPoints,
        })),
      });
    }
  });

  const accounts = await listAccounts(sessionUser.id);
  return NextResponse.json({ success: true, accounts });
});
