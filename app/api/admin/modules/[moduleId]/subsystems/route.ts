import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, withErrorHandler } from "@/lib/httpError";
import { subsystemInputSchema } from "@/lib/adminSchemas";
import { buildSubsystemCreateData } from "@/lib/adminBuilders";

type Ctx = { params: Promise<{ moduleId: string }> };

export const POST = withErrorHandler(async (req: NextRequest, ctx: Ctx) => {
  await requireAdmin();
  const { moduleId: midStr } = await ctx.params;
  const moduleId = Number.parseInt(midStr, 10);
  if (!Number.isFinite(moduleId)) return jsonError(400, "Invalid module id");

  const body: unknown = await req.json();
  const parsed = subsystemInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const data = parsed.data;

  const mod = await prisma.module.findUnique({ where: { id: moduleId } });
  if (!mod) return jsonError(404, "Module not found");

  const created = await prisma.$transaction(async (tx) => {
    const sub = await tx.subsystem.create({
      data: buildSubsystemCreateData(moduleId, data),
    });
    if (data.attributes.length > 0) {
      await tx.subsystemAttribute.createMany({
        data: data.attributes.map((attributeName) => ({
          subsystemId: sub.id,
          attributeName,
        })),
        skipDuplicates: true,
      });
    }
    if (data.priorities.length > 0) {
      await tx.targetPriorityShipType.createMany({
        data: data.priorities.map((p) => ({
          subsystemId: sub.id,
          scope: p.scope as never,
          order: p.order,
          shipType: p.shipType,
        })),
      });
    }
    return sub;
  });

  return NextResponse.json({ success: true, subsystem: { id: created.id } });
});
