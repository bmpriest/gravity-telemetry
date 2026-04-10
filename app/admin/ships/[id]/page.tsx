import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import ShipForm from "@/components/admin/ShipForm";
import type { ShipInput } from "@/lib/adminSchemas";

type Props = { params: Promise<{ id: string }> };

export default async function EditShipPage({ params }: Props) {
  const { id: idStr } = await params;
  const id = Number.parseInt(idStr, 10);
  if (!Number.isFinite(id)) notFound();

  const ship = await prisma.ship.findUnique({
    where: { id },
    include: { hangerCapacities: true, modules: { orderBy: { system: "asc" } } },
  });
  if (!ship) notFound();

  const initial: ShipInput & { id: number } = {
    id: ship.id,
    name: ship.name,
    title: ship.title,
    img: ship.img,
    type: ship.type,
    variant: ship.variant,
    variantName: ship.variantName,
    hasVariants: ship.hasVariants,
    manufacturer: ship.manufacturer,
    row: ship.row,
    commandPoints: ship.commandPoints,
    serviceLimit: ship.serviceLimit,
    fighterType: ship.fighterType,
    fightersPerSquadron: ship.fightersPerSquadron,
    hangerCapacities: ship.hangerCapacities.map((h) => ({
      slotType: h.slotType,
      capacity: h.capacity,
    })),
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl font-bold transition duration-500">{ship.name} <span className="text-base font-normal text-neutral-600 dark:text-neutral-400">({ship.variant})</span></h2>
        <Link href="/admin/ships" className="text-sm text-blue-700 underline transition duration-500 dark:text-blue-300">
          Back to ships
        </Link>
      </div>

      <ShipForm initial={initial} />

      <section className="flex flex-col gap-2 rounded-xl border border-neutral-300 p-4 transition duration-500 dark:border-neutral-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Modules ({ship.modules.length})</h3>
          <Link
            href={`/admin/ships/${String(ship.id)}/modules/new`}
            className="rounded-lg border border-blue-300 bg-blue-100 px-3 py-1 text-sm transition duration-500 hover:bg-blue-200 dark:border-blue-500 dark:bg-blue-800 dark:hover:bg-blue-700"
          >
            New module
          </Link>
        </div>
        {ship.modules.length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">No modules.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {ship.modules.map((m) => (
              <li key={m.id} className="flex items-center justify-between text-sm">
                <span>
                  <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400">{m.system}</span>{" "}
                  <span className="font-medium">{m.name ?? "(unknown)"}</span>{" "}
                  <span className="text-neutral-600 dark:text-neutral-400">· {m.kind}</span>
                </span>
                <Link
                  href={`/admin/ships/${String(ship.id)}/modules/${String(m.id)}`}
                  className="text-blue-700 underline transition duration-500 dark:text-blue-300"
                >
                  Edit
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
