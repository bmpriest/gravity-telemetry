import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, withErrorHandler } from "@/lib/httpError";
import { shipInputSchema } from "@/lib/adminSchemas";

export const POST = withErrorHandler(async (req: NextRequest) => {
  await requireAdmin();

  const body: unknown = await req.json();
  const parsed = shipInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const data = parsed.data;

  // Allocate next id (ships use seed-controlled int PK).
  const id = data.id ?? (await nextShipId());

  const created = await prisma.$transaction(async (tx) => {
    const ship = await tx.ship.create({
      data: {
        id,
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

    if (data.hangerCapacities.length > 0) {
      await tx.shipHangerCapacity.createMany({
        data: data.hangerCapacities.map((c) => ({
          shipId: ship.id,
          slotType: c.slotType as never,
          capacity: c.capacity,
        })),
      });
    }

    return ship;
  });

  return NextResponse.json({ success: true, ship: { id: created.id } });
});

async function nextShipId(): Promise<number> {
  const max = await prisma.ship.aggregate({ _max: { id: true } });
  return (max._max.id ?? 0) + 1;
}
