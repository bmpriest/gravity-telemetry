import prisma from "@/lib/prisma";
import AttributesManager from "@/components/admin/AttributesManager";

export default async function AdminAttributesPage() {
  const rows = await prisma.attribute.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { subsystems: true } } },
  });
  const attrs = rows.map((a) => ({
    name: a.name,
    description: a.description,
    usageCount: a._count.subsystems,
  }));

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold transition duration-500">Attributes ({attrs.length})</h2>
      <AttributesManager initial={attrs} />
    </div>
  );
}
