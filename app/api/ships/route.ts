import prisma from "@/lib/prisma";
import { handle } from "@/lib/api";
import { mapShips, shipInclude } from "@/lib/shipMapper";

export async function GET() {
  return handle(async () => {
    const ships = await prisma.ship.findMany({
      include: shipInclude,
      orderBy: { id: "asc" },
    });
    // The legacy `difficulty` field has been removed — see plan, Phase 1.
    return { data: mapShips(ships) };
  });
}
