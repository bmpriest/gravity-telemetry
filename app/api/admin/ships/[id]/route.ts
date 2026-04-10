import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, withErrorHandler } from "@/lib/httpError";
import { shipInputSchema } from "@/lib/adminSchemas";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withErrorHandler(async (req: NextRequest, ctx: Ctx) => {
  await requireAdmin();
  const { id: idStr } = await ctx.params;
  const id = Number.parseInt(idStr, 10);
  if (!Number.isFinite(id)) return jsonError(400, "Invalid ship id");

  const body: unknown = await req.json();
  const parsed = shipInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const data = parsed.data;

  const existing = await prisma.ship.findUnique({ where: { id } });
  if (!existing) return jsonError(404, "Ship not found");

  await prisma.$transaction(async (tx) => {
    await tx.ship.update({
      where: { id },
      data: {
        name: data.name,
        title: data.title,
        img: data.img,
        type: data.type as never,
        variant: data.variant as never,
        variantName: data.variantName,
        hasVariants: data.hasVariants,
        manufacturer: data.manufacturer as never,
        row: data.row as never,
        commandPoints: data.commandPoints,
        serviceLimit: data.serviceLimit,
        fighterType: (data.type === "Fighter" ? data.fighterType : null) as never,
        fightersPerSquadron:
          data.type === "Fighter" ? data.fightersPerSquadron ?? null : null,
      },
    });

    // Replace hanger capacities (small enough rowset to delete-and-recreate).
    await tx.shipHangerCapacity.deleteMany({ where: { shipId: id } });
    if (data.hangerCapacities.length > 0) {
      await tx.shipHangerCapacity.createMany({
        data: data.hangerCapacities.map((c) => ({
          shipId: id,
          slotType: c.slotType as never,
          capacity: c.capacity,
        })),
      });
    }
  });

  return NextResponse.json({ success: true });
});

export const DELETE = withErrorHandler(async (_req: NextRequest, ctx: Ctx) => {
  await requireAdmin();
  const { id: idStr } = await ctx.params;
  const id = Number.parseInt(idStr, 10);
  if (!Number.isFinite(id)) return jsonError(400, "Invalid ship id");

  const existing = await prisma.ship.findUnique({
    where: { id },
    include: { _count: { select: { fleetInstances: true } } },
  });
  if (!existing) return jsonError(404, "Ship not found");
  if (existing._count.fleetInstances > 0) {
    return jsonError(
      409,
      "Cannot delete: ship is referenced by saved fleet instances"
    );
  }

  await prisma.ship.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
