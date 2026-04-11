import prisma from "@/lib/prisma";
import { handle } from "@/lib/api";
import { mapShip, shipInclude } from "@/lib/shipMapper";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) throw new Error("Invalid ship id.");

    const ship = await prisma.ship.findUnique({
      where: { id: numericId },
      include: shipInclude,
    });
    if (!ship) throw new Error("Ship not found.");

    return { data: mapShip(ship) };
  });
}
