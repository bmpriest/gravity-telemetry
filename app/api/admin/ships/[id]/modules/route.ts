import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, withErrorHandler } from "@/lib/httpError";
import { moduleInputSchema } from "@/lib/adminSchemas";
import { buildModuleCreateData } from "@/lib/adminBuilders";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withErrorHandler(async (req: NextRequest, ctx: Ctx) => {
  await requireAdmin();
  const { id: idStr } = await ctx.params;
  const shipId = Number.parseInt(idStr, 10);
  if (!Number.isFinite(shipId)) return jsonError(400, "Invalid ship id");

  const body: unknown = await req.json();
  const parsed = moduleInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const data = parsed.data;

  const ship = await prisma.ship.findUnique({ where: { id: shipId } });
  if (!ship) return jsonError(404, "Ship not found");

  const created = await prisma.$transaction(async (tx) => {
    const mod = await tx.module.create({
      data: buildModuleCreateData(shipId, data),
    });
    if (data.sources.length > 0) {
      await tx.moduleSource.createMany({
        data: data.sources.map((name) => ({ moduleId: mod.id, name })),
        skipDuplicates: true,
      });
    }
    return mod;
  });

  return NextResponse.json({ success: true, module: { id: created.id } });
});
