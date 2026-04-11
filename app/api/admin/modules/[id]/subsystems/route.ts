/**
 * POST /api/admin/modules/:id/subsystems — attach a subsystem to a module.
 *
 * The body carries the optional target categories / UAV priorities arrays so
 * the admin form can save the whole subsystem in one call rather than juggling
 * a follow-up request per category.
 */

import type { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { handle } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import {
  asFloatOrNull, asInt, asIntOrNull, asStringOrNull,
  parseDamageType, parseSubsystemKind, parseWeaponTarget,
} from "@/lib/adminPayloads";

interface TargetCategoryInput {
  category: "antiship" | "antiair" | "siege";
  position: number;
  damage: number;
  priorities?: Array<{ order: number; targetType: string }>;
}
interface UavPriorityInput { order: number; targetType: string }

interface Body {
  count: number;
  title: string;
  name: string;
  kind: string;
  damageType?: string | null;
  target?: string | null;
  lockonEfficiency?: number | null;
  alpha?: number | null;
  hanger?: string | null;
  capacity?: number | null;
  repair?: number | null;
  cooldown?: number | null;
  lockOnTime?: number | null;
  duration?: number | null;
  damageFrequency?: number | null;
  attacksPerRoundA?: number | null;
  attacksPerRoundB?: number | null;
  operationCountA?: number | null;
  operationCountB?: number | null;
  attributes?: string[];
  targetCategories?: TargetCategoryInput[];
  uavPriorities?: UavPriorityInput[];
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await requireAdmin();
    const { id } = await params;
    const moduleId = Number(id);
    if (!Number.isInteger(moduleId)) throw new Error("Invalid module id.");

    const body = (await req.json()) as Body;

    const created = await prisma.subsystem.create({
      data: {
        moduleId,
        count: asInt(body.count, "count"),
        title: body.title,
        name: body.name,
        kind: parseSubsystemKind(body.kind),
        damageType: parseDamageType(body.damageType),
        target: parseWeaponTarget(body.target),
        lockonEfficiency: asIntOrNull(body.lockonEfficiency),
        alpha: asIntOrNull(body.alpha),
        hanger: asStringOrNull(body.hanger),
        capacity: asIntOrNull(body.capacity),
        repair: asIntOrNull(body.repair),
        cooldown: asFloatOrNull(body.cooldown),
        lockOnTime: asFloatOrNull(body.lockOnTime),
        duration: asFloatOrNull(body.duration),
        damageFrequency: asFloatOrNull(body.damageFrequency),
        attacksPerRoundA: asIntOrNull(body.attacksPerRoundA),
        attacksPerRoundB: asIntOrNull(body.attacksPerRoundB),
        operationCountA: asIntOrNull(body.operationCountA),
        operationCountB: asIntOrNull(body.operationCountB),
      },
    });

    if (Array.isArray(body.attributes) && body.attributes.length > 0) {
      await prisma.subsystemAttribute.createMany({
        data: body.attributes.map((a) => ({ subsystemId: created.id, attribute: a })),
      });
    }

    if (Array.isArray(body.targetCategories)) {
      for (const cat of body.targetCategories) {
        const created2 = await prisma.subsystemTargetCategory.create({
          data: {
            subsystemId: created.id,
            category: cat.category,
            position: asInt(cat.position, "position"),
            damage: asInt(cat.damage, "damage"),
          },
        });
        if (Array.isArray(cat.priorities) && cat.priorities.length > 0) {
          await prisma.subsystemTargetType.createMany({
            data: cat.priorities.map((p) => ({
              categoryId: created2.id,
              order: asInt(p.order, "order"),
              targetType: p.targetType,
            })),
          });
        }
      }
    }

    if (Array.isArray(body.uavPriorities) && body.uavPriorities.length > 0) {
      await prisma.subsystemUavPriority.createMany({
        data: body.uavPriorities.map((p) => ({
          subsystemId: created.id,
          order: asInt(p.order, "order"),
          targetType: p.targetType,
        })),
      });
    }

    return { id: created.id };
  });
}
