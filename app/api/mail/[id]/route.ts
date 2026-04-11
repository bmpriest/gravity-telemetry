import prisma from "@/lib/prisma";
import { handle } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { untruncateOps } from "@/utils/functions";
import type { TruncatedOp } from "@/utils/types";

/**
 * GET    /api/mail/:id  — fetch a single mail (authorized for the owner only)
 * DELETE /api/mail/:id  — remove a mail
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await params;

    const mail = await prisma.savedMail.findFirst({ where: { id, userId: user.id } });
    if (!mail) throw new Error("Mail not found.");

    return {
      data: {
        id: mail.id,
        name: mail.name,
        ops: untruncateOps(JSON.parse(mail.ops) as TruncatedOp[]),
        lastSaved: mail.lastSaved.toISOString(),
        createdAt: mail.createdAt.toISOString(),
      },
    };
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await params;

    const mail = await prisma.savedMail.findFirst({ where: { id, userId: user.id } });
    if (!mail) throw new Error("Mail not found.");
    await prisma.savedMail.delete({ where: { id } });

    return {};
  });
}
