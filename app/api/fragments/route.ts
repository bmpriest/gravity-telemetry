import prisma from "@/lib/prisma";
import { handle } from "@/lib/api";

/**
 * Public fragment dictionary — id → name (+ ordering hints). Read-only and
 * unauthenticated so the Blueprint Tracker and Blueprint Fragments pages can
 * label fragments for any visitor. (The admin CRUD lives at
 * /api/admin/fragments behind requireAdmin; using that here meant non-admins
 * saw raw "Fragment <id>" placeholders because the call 403'd.)
 */
export async function GET() {
  return handle(async () => {
    const fragments = await prisma.blueprintFragment.findMany({
      select: { id: true, name: true, common: true, exchangeCost: true },
      orderBy: { name: "asc" },
    });
    return { data: fragments };
  });
}
