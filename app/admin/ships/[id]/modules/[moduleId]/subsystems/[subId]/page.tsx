import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import SubsystemForm from "@/components/admin/SubsystemForm";
import type { SubsystemInput } from "@/lib/adminSchemas";

type Props = { params: Promise<{ id: string; moduleId: string; subId: string }> };

export default async function EditSubsystemPage({ params }: Props) {
  const { id: idStr, moduleId: midStr, subId: sidStr } = await params;
  const shipId = Number.parseInt(idStr, 10);
  const moduleId = Number.parseInt(midStr, 10);
  const subsystemId = Number.parseInt(sidStr, 10);
  if (!Number.isFinite(shipId) || !Number.isFinite(moduleId) || !Number.isFinite(subsystemId)) notFound();

  const [sub, attributes] = await Promise.all([
    prisma.subsystem.findUnique({
      where: { id: subsystemId },
      include: { attributes: true, priorities: true, module: true },
    }),
    prisma.attribute.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
  ]);
  if (!sub || sub.moduleId !== moduleId || sub.module.shipId !== shipId) notFound();

  const initial: SubsystemInput & { id: number } = {
    id: sub.id,
    kind: sub.kind,
    count: sub.count,
    title: sub.title,
    name: sub.name,
    sortOrder: sub.sortOrder,
    damageType: sub.damageType,
    weaponTarget: sub.weaponTarget,
    lockonEfficiency: sub.lockonEfficiency,
    alpha: sub.alpha,
    hangerSlot: sub.hangerSlot,
    capacity: sub.capacity,
    repair: sub.repair,
    statsKind: sub.statsKind,
    attacksPerRoundA: sub.attacksPerRoundA,
    attacksPerRoundB: sub.attacksPerRoundB,
    duration: sub.duration,
    damageFrequency: sub.damageFrequency,
    cooldown: sub.cooldown,
    lockOnTime: sub.lockOnTime,
    operationCountA: sub.operationCountA,
    operationCountB: sub.operationCountB,
    antishipPosition: sub.antishipPosition,
    antishipDamage: sub.antishipDamage,
    antiairPosition: sub.antiairPosition,
    antiairDamage: sub.antiairDamage,
    siegePosition: sub.siegePosition,
    siegeDamage: sub.siegeDamage,
    attributes: sub.attributes.map((a) => a.attributeName),
    priorities: sub.priorities.map((p) => ({
      scope: p.scope,
      order: p.order,
      shipType: p.shipType,
    })),
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl font-bold transition duration-500">{sub.name}</h2>
        <Link
          href={`/admin/ships/${String(shipId)}/modules/${String(moduleId)}`}
          className="text-sm text-blue-700 underline transition duration-500 dark:text-blue-300"
        >
          Back to module
        </Link>
      </div>
      <SubsystemForm shipId={shipId} moduleId={moduleId} attributes={attributes} initial={initial} />
    </div>
  );
}
