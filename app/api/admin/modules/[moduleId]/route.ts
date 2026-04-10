import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, withErrorHandler } from "@/lib/httpError";
import { moduleInputSchema } from "@/lib/adminSchemas";
import { buildModuleCreateData } from "@/lib/adminBuilders";

type Ctx = { params: Promise<{ moduleId: string }> };

export const PATCH = withErrorHandler(async (req: NextRequest, ctx: Ctx) => {
  await requireAdmin();
  const { moduleId: midStr } = await ctx.params;
  const moduleId = Number.parseInt(midStr, 10);
  if (!Number.isFinite(moduleId)) return jsonError(400, "Invalid module id");

  const existing = await prisma.module.findUnique({ where: { id: moduleId } });
  if (!existing) return jsonError(404, "Module not found");

  const body: unknown = await req.json();
  const parsed = moduleInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const data = parsed.data;

  await prisma.$transaction(async (tx) => {
    const updateData = buildModuleCreateData(existing.shipId, data);
    // shipId is not part of update payload (immutable)
    const { shipId: _shipId, ...rest } = updateData;
    void _shipId;
    await tx.module.update({ where: { id: moduleId }, data: rest });
    await tx.moduleSource.deleteMany({ where: { moduleId } });
    if (data.sources.length > 0) {
      await tx.moduleSource.createMany({
        data: data.sources.map((name) => ({ moduleId, name })),
        skipDuplicates: true,
      });
    }
  });

  return NextResponse.json({ success: true });
});

export const DELETE = withErrorHandler(async (_req: NextRequest, ctx: Ctx) => {
  await requireAdmin();
  const { moduleId: midStr } = await ctx.params;
  const moduleId = Number.parseInt(midStr, 10);
  if (!Number.isFinite(moduleId)) return jsonError(400, "Invalid module id");
  const existing = await prisma.module.findUnique({ where: { id: moduleId } });
  if (!existing) return jsonError(404, "Module not found");

  await prisma.module.delete({ where: { id: moduleId } });
  return NextResponse.json({ success: true });
});
