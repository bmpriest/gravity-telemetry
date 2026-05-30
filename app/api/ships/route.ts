import prisma from "@/lib/prisma";
import { handle } from "@/lib/api";
import { mapLegacyShips, legacyShipInclude } from "@/lib/shipMapper";

/**
 * Legacy ship catalogue consumed by the fleet builder + blueprint tracker via
 * `useUserStore.shipData`. Returns the v3 `AllShip[]` shape and only ships the
 * admin has marked visible.
 */
export async function GET() {
  return handle(async () => {
    const ships = await prisma.ship.findMany({
      where: { visible: true },
      include: legacyShipInclude,
      orderBy: { id: "asc" },
    });
    return { data: mapLegacyShips(ships) };
  });
}
