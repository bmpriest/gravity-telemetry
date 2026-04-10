import Link from "next/link";
import prisma from "@/lib/prisma";
import ShipsTable, { type ShipRow } from "@/components/admin/ShipsTable";

export default async function AdminShipsPage() {
  const ships = await prisma.ship.findMany({
    orderBy: [{ name: "asc" }, { variant: "asc" }],
    select: {
      id: true,
      name: true,
      variant: true,
      variantName: true,
      type: true,
      manufacturer: true,
      _count: { select: { modules: true } },
    },
  });

  const rows: ShipRow[] = ships.map((s) => ({
    id: s.id,
    name: s.name,
    variant: s.variant,
    variantName: s.variantName,
    type: s.type,
    manufacturer: s.manufacturer,
    moduleCount: s._count.modules,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl font-bold transition duration-500">Ships</h2>
        <Link
          href="/admin/ships/new"
          className="rounded-xl border border-blue-300 bg-blue-100 px-4 py-2 text-sm font-medium transition duration-500 hover:scale-105 hover:border-blue-400 hover:bg-blue-200 dark:border-blue-500 dark:bg-blue-800 dark:hover:bg-blue-700"
        >
          New ship
        </Link>
      </div>
      <ShipsTable ships={rows} />
    </div>
  );
}
