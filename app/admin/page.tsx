import Link from "next/link";
import prisma from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const [shipCount, moduleCount, subsystemCount, attributeCount, userCount] = await Promise.all([
    prisma.ship.count(),
    prisma.module.count(),
    prisma.subsystem.count(),
    prisma.attribute.count(),
    prisma.user.count(),
  ]);

  // href: link if there's a dedicated list page; null = plain stat tile.
  const cards: Array<{ label: string; value: number; href: string | null }> = [
    { label: "Ships", value: shipCount, href: "/admin/ships" },
    { label: "Modules", value: moduleCount, href: null },
    { label: "Subsystems", value: subsystemCount, href: null },
    { label: "Attributes", value: attributeCount, href: "/admin/attributes" },
    { label: "Users", value: userCount, href: "/admin/users" },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => {
        const inner = (
          <>
            <span className="text-sm uppercase tracking-wide text-neutral-600 transition duration-500 dark:text-neutral-400">{c.label}</span>
            <span className="text-3xl font-bold transition duration-500">{c.value}</span>
          </>
        );
        return c.href ? (
          <Link
            key={c.label}
            href={c.href}
            className="flex flex-col gap-2 rounded-2xl border border-neutral-300 bg-neutral-100/50 p-4 transition duration-500 hover:scale-[1.02] hover:border-blue-400 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-blue-500"
          >
            {inner}
          </Link>
        ) : (
          <div
            key={c.label}
            className="flex flex-col gap-2 rounded-2xl border border-neutral-300 bg-neutral-100/50 p-4 transition duration-500 dark:border-neutral-700 dark:bg-neutral-900"
          >
            {inner}
          </div>
        );
      })}
    </div>
  );
}
