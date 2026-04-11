/**
 * POST /api/admin/ships/:id/modules — attach a new module to a supercapital
 * ship. Subsystems are added through /api/admin/modules/:id/subsystems so that
 * each resource has exactly one create endpoint.
 */

import type { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { handle } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { asIntOrNull, asStringOrNull, parseModuleKind } from "@/lib/adminPayloads";

interface Body {
  kind: string;
  system: string;
  isDefault?: boolean;
  isUnknown?: boolean;
  img?: string | null;
  name?: string | null;
  hp?: number | null;
  antiship?: number | null;
  antiair?: number | null;
  siege?: number | null;
  cruise?: number | null;
  warp?: number | null;
  armor?: number | null;
  extraHp?: number | null;
  energyShield?: number | null;
  hpRecovery?: number | null;
  storage?: number | null;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await requireAdmin();
    const { id } = await params;
    const shipId = Number(id);
    if (!Number.isInteger(shipId)) throw new Error("Invalid ship id.");

    const body = (await req.json()) as Body;
    if (!body.system) throw new Error("system is required.");

    const ship = await prisma.ship.findUnique({ where: { id: shipId } });
    if (!ship) throw new Error("Ship not found.");

    const created = await prisma.shipModule.create({
      data: {
        shipId,
        kind: parseModuleKind(body.kind),
        system: body.system,
        isDefault: !!body.isDefault,
        isUnknown: !!body.isUnknown,
        img: asStringOrNull(body.img),
        name: asStringOrNull(body.name),
        hp: asIntOrNull(body.hp),
        antiship: asIntOrNull(body.antiship),
        antiair: asIntOrNull(body.antiair),
        siege: asIntOrNull(body.siege),
        cruise: asIntOrNull(body.cruise),
        warp: asIntOrNull(body.warp),
        armor: asIntOrNull(body.armor),
        extraHp: asIntOrNull(body.extraHp),
        energyShield: asIntOrNull(body.energyShield),
        hpRecovery: asIntOrNull(body.hpRecovery),
        storage: asIntOrNull(body.storage),
      },
    });

    return { id: created.id };
  });
}
