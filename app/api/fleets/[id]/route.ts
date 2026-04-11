import prisma from "@/lib/prisma";
import { handle } from "@/lib/api";
import { requireUser } from "@/lib/session";

/**
 * DELETE /api/fleets/:id — remove a saved fleet. The id is client-generated
 * (see utils/fleet.generateFleetId) so we have to verify ownership rather than
 * trusting the URL.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await params;

    const fleet = await prisma.savedFleet.findUnique({ where: { id } });
    if (!fleet || fleet.userId !== user.id) throw new Error("Fleet not found.");

    await prisma.savedFleet.delete({ where: { id } });
    return {};
  });
}
