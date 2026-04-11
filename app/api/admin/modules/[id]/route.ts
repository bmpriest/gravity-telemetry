/**
 * PATCH  /api/admin/modules/:id — partial update of a ShipModule.
 * DELETE /api/admin/modules/:id — remove the module; cascades to subsystems
 *                                 and module-blueprints.
 */

import type { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { handle } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { asIntOrNull, asStringOrNull, parseModuleKind } from "@/lib/adminPayloads";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildUpdateData(body: Record<string, any>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};
  if ("kind" in body) data.kind = parseModuleKind(body.kind);
  if ("system" in body) data.system = body.system;
  if ("isDefault" in body) data.isDefault = !!body.isDefault;
  if ("isUnknown" in body) data.isUnknown = !!body.isUnknown;
  if ("img" in body) data.img = asStringOrNull(body.img);
  if ("name" in body) data.name = asStringOrNull(body.name);
  if ("hp" in body) data.hp = asIntOrNull(body.hp);
  if ("antiship" in body) data.antiship = asIntOrNull(body.antiship);
  if ("antiair" in body) data.antiair = asIntOrNull(body.antiair);
  if ("siege" in body) data.siege = asIntOrNull(body.siege);
  if ("cruise" in body) data.cruise = asIntOrNull(body.cruise);
  if ("warp" in body) data.warp = asIntOrNull(body.warp);
  if ("armor" in body) data.armor = asIntOrNull(body.armor);
  if ("extraHp" in body) data.extraHp = asIntOrNull(body.extraHp);
  if ("energyShield" in body) data.energyShield = asIntOrNull(body.energyShield);
  if ("hpRecovery" in body) data.hpRecovery = asIntOrNull(body.hpRecovery);
  if ("storage" in body) data.storage = asIntOrNull(body.storage);
  return data;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await requireAdmin();
    const { id } = await params;
    const moduleId = Number(id);
    if (!Number.isInteger(moduleId)) throw new Error("Invalid module id.");

    const data = buildUpdateData(await req.json());
    if (Object.keys(data).length === 0) throw new Error("No fields to update.");

    await prisma.shipModule.update({ where: { id: moduleId }, data });
    return {};
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await requireAdmin();
    const { id } = await params;
    const moduleId = Number(id);
    if (!Number.isInteger(moduleId)) throw new Error("Invalid module id.");

    await prisma.shipModule.delete({ where: { id: moduleId } });
    return {};
  });
}
