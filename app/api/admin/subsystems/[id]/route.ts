/**
 * PATCH  /api/admin/subsystems/:id — partial update of a subsystem.
 * DELETE /api/admin/subsystems/:id — remove a subsystem; cascades to attributes,
 *                                    target categories, target types, and UAV
 *                                    priority rows.
 */

import type { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { handle } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import {
  asFloatOrNull, asInt, asIntOrNull, asStringOrNull,
  parseDamageType, parseSubsystemKind, parseWeaponTarget,
} from "@/lib/adminPayloads";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildUpdateData(body: Record<string, any>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};
  if ("count" in body) data.count = asInt(body.count, "count");
  if ("title" in body) data.title = body.title;
  if ("name" in body) data.name = body.name;
  if ("kind" in body) data.kind = parseSubsystemKind(body.kind);
  if ("damageType" in body) data.damageType = parseDamageType(body.damageType);
  if ("target" in body) data.target = parseWeaponTarget(body.target);
  if ("lockonEfficiency" in body) data.lockonEfficiency = asIntOrNull(body.lockonEfficiency);
  if ("alpha" in body) data.alpha = asIntOrNull(body.alpha);
  if ("hanger" in body) data.hanger = asStringOrNull(body.hanger);
  if ("capacity" in body) data.capacity = asIntOrNull(body.capacity);
  if ("onlyCarriesDualPurpose" in body) data.onlyCarriesDualPurpose = !!body.onlyCarriesDualPurpose;
  if ("repair" in body) data.repair = asIntOrNull(body.repair);
  if ("cooldown" in body) data.cooldown = asFloatOrNull(body.cooldown);
  if ("lockOnTime" in body) data.lockOnTime = asFloatOrNull(body.lockOnTime);
  if ("duration" in body) data.duration = asFloatOrNull(body.duration);
  if ("damageFrequency" in body) data.damageFrequency = asFloatOrNull(body.damageFrequency);
  if ("attacksPerRoundA" in body) data.attacksPerRoundA = asIntOrNull(body.attacksPerRoundA);
  if ("attacksPerRoundB" in body) data.attacksPerRoundB = asIntOrNull(body.attacksPerRoundB);
  if ("operationCountA" in body) data.operationCountA = asIntOrNull(body.operationCountA);
  if ("operationCountB" in body) data.operationCountB = asIntOrNull(body.operationCountB);
  return data;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await requireAdmin();
    const { id } = await params;
    const subsystemId = Number(id);
    if (!Number.isInteger(subsystemId)) throw new Error("Invalid subsystem id.");

    const data = buildUpdateData(await req.json());
    if (Object.keys(data).length === 0) throw new Error("No fields to update.");

    await prisma.subsystem.update({ where: { id: subsystemId }, data });
    return {};
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await requireAdmin();
    const { id } = await params;
    const subsystemId = Number(id);
    if (!Number.isInteger(subsystemId)) throw new Error("Invalid subsystem id.");

    await prisma.subsystem.delete({ where: { id: subsystemId } });
    return {};
  });
}
