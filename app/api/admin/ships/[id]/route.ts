/**
 * GET    /api/admin/ships/:id  — fetch one ship with full module + subsystem
 *                                tree, used by the admin module editor to
 *                                refresh after CRUD without re-pulling the
 *                                whole catalogue.
 * PATCH  /api/admin/ships/:id  — partial update of a ship row.
 * DELETE /api/admin/ships/:id  — remove the ship; cascades to modules /
 *                                subsystems / blueprints / fleet instances.
 */

import type { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { handle } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { mapShip, shipInclude } from "@/lib/shipMapper";
import {
  asInt, asIntOrNull, parseFighterSize, parseManufacturerId, parseRow, parseShipType,
} from "@/lib/adminPayloads";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildUpdateData(body: Record<string, any>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};
  if ("name" in body) data.name = body.name;
  if ("title" in body) data.title = body.title;
  // img can be set to an empty string explicitly to clear it; the shipMapper
  // fallback chain takes over from there.
  if ("img" in body) data.img = body.img ?? "";
  if ("type" in body) data.type = parseShipType(body.type);
  if ("variant" in body) data.variant = body.variant;
  if ("variantName" in body) data.variantName = body.variantName;
  if ("hasVariants" in body) data.hasVariants = !!body.hasVariants;
  if ("manufacturerId" in body) data.manufacturerId = parseManufacturerId(body.manufacturerId);
  if ("row" in body) data.row = parseRow(body.row);
  if ("commandPoints" in body) data.commandPoints = asInt(body.commandPoints, "commandPoints");
  if ("serviceLimit" in body) data.serviceLimit = asInt(body.serviceLimit, "serviceLimit");
  if ("fighterType" in body) data.fighterType = parseFighterSize(body.fighterType);
  if ("fightersPerSquadron" in body) data.fightersPerSquadron = asIntOrNull(body.fightersPerSquadron);
  if ("dualPurpose" in body) data.dualPurpose = !!body.dualPurpose;
  if ("smallFighterCapacity" in body) data.smallFighterCapacity = asIntOrNull(body.smallFighterCapacity);
  if ("mediumFighterCapacity" in body) data.mediumFighterCapacity = asIntOrNull(body.mediumFighterCapacity);
  if ("largeFighterCapacity" in body) data.largeFighterCapacity = asIntOrNull(body.largeFighterCapacity);
  if ("corvetteCapacity" in body) data.corvetteCapacity = asIntOrNull(body.corvetteCapacity);
  if ("onlyCarriesDualPurpose" in body) data.onlyCarriesDualPurpose = !!body.onlyCarriesDualPurpose;
  return data;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await requireAdmin();
    const { id } = await params;
    const numericId = Number(id);
    if (!Number.isInteger(numericId)) throw new Error("Invalid ship id.");

    const ship = await prisma.ship.findUnique({
      where: { id: numericId },
      include: shipInclude,
    });
    if (!ship) throw new Error("Ship not found.");
    return { data: mapShip(ship) };
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await requireAdmin();
    const { id } = await params;
    const numericId = Number(id);
    if (!Number.isInteger(numericId)) throw new Error("Invalid ship id.");

    const body = await req.json();
    const data = buildUpdateData(body);
    if (Object.keys(data).length === 0) throw new Error("No fields to update.");

    await prisma.ship.update({ where: { id: numericId }, data });
    return {};
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await requireAdmin();
    const { id } = await params;
    const numericId = Number(id);
    if (!Number.isInteger(numericId)) throw new Error("Invalid ship id.");

    await prisma.ship.delete({ where: { id: numericId } });
    return {};
  });
}
