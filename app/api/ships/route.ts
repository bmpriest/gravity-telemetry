import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { mapShip } from "@/lib/shipMapper";

// Reads from Postgres — do not statically cache at build time.
export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await prisma.ship.findMany({
    include: {
      hangerCapacities: true,
      modules: {
        include: {
          sources: true,
          subsystems: {
            include: { attributes: true, priorities: true },
          },
        },
      },
    },
    orderBy: { id: "asc" },
  });

  const data = rows.map(mapShip);
  return NextResponse.json({ data });
}
