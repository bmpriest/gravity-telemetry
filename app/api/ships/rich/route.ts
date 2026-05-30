import prisma from "@/lib/prisma";
import { handle } from "@/lib/api";
import { mapRichShips, richShipInclude } from "@/lib/richShipMapper";

/**
 * Rich ship catalogue for the System Library, Blueprint Library and shared
 * System View. Returns the full RichShip[] (systems → slots → modules →
 * weapon → target priorities, effects, carried craft, hangar stats, …).
 * Public route — only visible ships.
 */
export async function GET() {
  return handle(async () => {
    const ships = await prisma.ship.findMany({
      where: { visible: true },
      include: richShipInclude,
      orderBy: { id: "asc" },
    });
    return { data: mapRichShips(ships) };
  });
}
