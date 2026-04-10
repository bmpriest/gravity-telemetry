import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, withErrorHandler } from "@/lib/httpError";
import { subsystemInputSchema } from "@/lib/adminSchemas";
import { buildSubsystemCreateData } from "@/lib/adminBuilders";

type Ctx = { params: Promise<{ subsystemId: string }> };

export const PATCH = withErrorHandler(async (req: NextRequest, ctx: Ctx) => {
  await requireAdmin();
  const { subsystemId: sidStr } = await ctx.params;
  const subsystemId = Number.parseInt(sidStr, 10);
  if (!Number.isFinite(subsystemId)) return jsonError(400, "Invalid subsystem id");

  const existing = await prisma.subsystem.findUnique({ where: { id: subsystemId } });
  if (!existing) return jsonError(404, "Subsystem not found");

  const body: unknown = await req.json();
  const parsed = subsystemInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const data = parsed.data;

  await prisma.$transaction(async (tx) => {
    const updateData = buildSubsystemCreateData(existing.moduleId, data);
    const { moduleId: _moduleId, ...rest } = updateData;
    void _moduleId;
    await tx.subsystem.update({ where: { id: subsystemId }, data: rest });
    await tx.subsystemAttribute.deleteMany({ where: { subsystemId } });
    if (data.attributes.length > 0) {
      await tx.subsystemAttribute.createMany({
        data: data.attributes.map((attributeName) => ({
          subsystemId,
          attributeName,
        })),
        skipDuplicates: true,
      });
    }
    await tx.targetPriorityShipType.deleteMany({ where: { subsystemId } });
    if (data.priorities.length > 0) {
      await tx.targetPriorityShipType.createMany({
        data: data.priorities.map((p) => ({
          subsystemId,
          scope: p.scope as never,
          order: p.order,
          shipType: p.shipType,
        })),
      });
    }
  });

  return NextResponse.json({ success: true });
});

export const DELETE = withErrorHandler(async (_req: NextRequest, ctx: Ctx) => {
  await requireAdmin();
  const { subsystemId: sidStr } = await ctx.params;
  const subsystemId = Number.parseInt(sidStr, 10);
  if (!Number.isFinite(subsystemId)) return jsonError(400, "Invalid subsystem id");
  const existing = await prisma.subsystem.findUnique({ where: { id: subsystemId } });
  if (!existing) return jsonError(404, "Subsystem not found");

  await prisma.subsystem.delete({ where: { id: subsystemId } });
  return NextResponse.json({ success: true });
});
