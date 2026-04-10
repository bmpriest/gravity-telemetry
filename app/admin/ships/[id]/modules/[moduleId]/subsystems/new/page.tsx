import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import SubsystemForm from "@/components/admin/SubsystemForm";

type Props = { params: Promise<{ id: string; moduleId: string }> };

export default async function NewSubsystemPage({ params }: Props) {
  const { id: idStr, moduleId: midStr } = await params;
  const shipId = Number.parseInt(idStr, 10);
  const moduleId = Number.parseInt(midStr, 10);
  if (!Number.isFinite(shipId) || !Number.isFinite(moduleId)) notFound();

  const [mod, attributes] = await Promise.all([
    prisma.module.findUnique({ where: { id: moduleId } }),
    prisma.attribute.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
  ]);
  if (!mod || mod.shipId !== shipId) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl font-bold transition duration-500">New subsystem</h2>
        <Link
          href={`/admin/ships/${String(shipId)}/modules/${String(moduleId)}`}
          className="text-sm text-blue-700 underline transition duration-500 dark:text-blue-300"
        >
          Back to module
        </Link>
      </div>
      <SubsystemForm shipId={shipId} moduleId={moduleId} attributes={attributes} />
    </div>
  );
}
