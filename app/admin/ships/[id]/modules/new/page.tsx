import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import ModuleForm from "@/components/admin/ModuleForm";

type Props = { params: Promise<{ id: string }> };

export default async function NewModulePage({ params }: Props) {
  const { id: idStr } = await params;
  const shipId = Number.parseInt(idStr, 10);
  if (!Number.isFinite(shipId)) notFound();

  const ship = await prisma.ship.findUnique({ where: { id: shipId } });
  if (!ship) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl font-bold transition duration-500">New module</h2>
        <Link href={`/admin/ships/${String(shipId)}`} className="text-sm text-blue-700 underline transition duration-500 dark:text-blue-300">
          Back to {ship.name}
        </Link>
      </div>
      <ModuleForm shipId={shipId} />
    </div>
  );
}
