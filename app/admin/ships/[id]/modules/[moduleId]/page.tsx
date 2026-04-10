import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import ModuleForm from "@/components/admin/ModuleForm";
import type { ModuleInput } from "@/lib/adminSchemas";

type Props = { params: Promise<{ id: string; moduleId: string }> };

export default async function EditModulePage({ params }: Props) {
  const { id: idStr, moduleId: midStr } = await params;
  const shipId = Number.parseInt(idStr, 10);
  const moduleId = Number.parseInt(midStr, 10);
  if (!Number.isFinite(shipId) || !Number.isFinite(moduleId)) notFound();

  const mod = await prisma.module.findUnique({
    where: { id: moduleId },
    include: { sources: true, subsystems: { orderBy: { sortOrder: "asc" } } },
  });
  if (!mod || mod.shipId !== shipId) notFound();

  const initial: ModuleInput & { id: number } = {
    id: mod.id,
    system: mod.system,
    kind: mod.kind,
    isDefault: mod.isDefault,
    img: mod.img,
    name: mod.name,
    hp: mod.hp,
    antishipDamage: mod.antishipDamage,
    antiairDamage: mod.antiairDamage,
    siegeDamage: mod.siegeDamage,
    cruise: mod.cruise,
    warp: mod.warp,
    armor: mod.armor,
    extraHp: mod.extraHp,
    energyShield: mod.energyShield,
    hpRecovery: mod.hpRecovery,
    storage: mod.storage,
    sources: mod.sources.map((s) => s.name),
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl font-bold transition duration-500">
          {mod.system} <span className="text-base font-normal text-neutral-600 dark:text-neutral-400">{mod.name ?? "(unknown)"}</span>
        </h2>
        <Link href={`/admin/ships/${String(shipId)}`} className="text-sm text-blue-700 underline transition duration-500 dark:text-blue-300">
          Back to ship
        </Link>
      </div>

      <ModuleForm shipId={shipId} initial={initial} />

      <section className="flex flex-col gap-2 rounded-xl border border-neutral-300 p-4 transition duration-500 dark:border-neutral-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Subsystems ({mod.subsystems.length})</h3>
          <Link
            href={`/admin/ships/${String(shipId)}/modules/${String(moduleId)}/subsystems/new`}
            className="rounded-lg border border-blue-300 bg-blue-100 px-3 py-1 text-sm transition duration-500 hover:bg-blue-200 dark:border-blue-500 dark:bg-blue-800 dark:hover:bg-blue-700"
          >
            New subsystem
          </Link>
        </div>
        {mod.subsystems.length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">No subsystems.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {mod.subsystems.map((s) => (
              <li key={s.id} className="flex items-center justify-between text-sm">
                <span>
                  <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400">[{s.kind}]</span>{" "}
                  <span className="font-medium">{s.name}</span>{" "}
                  <span className="text-neutral-600 dark:text-neutral-400">· {s.title}</span>
                </span>
                <Link
                  href={`/admin/ships/${String(shipId)}/modules/${String(moduleId)}/subsystems/${String(s.id)}`}
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
