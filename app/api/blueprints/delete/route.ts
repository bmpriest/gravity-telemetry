import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { jsonError, withErrorHandler } from "@/lib/httpError";
import { listAccounts } from "@/lib/blueprints";

const deleteSchema = z.object({
  accountIndex: z.number().int().min(0).max(9),
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const sessionUser = await requireUser();

  const body: unknown = await req.json();
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "Invalid input");
  }

  const { accountIndex } = parsed.data;

  await prisma.$transaction(async (tx) => {
    const target = await tx.blueprintAccount.findUnique({
      where: {
        userId_accountIndex: { userId: sessionUser.id, accountIndex },
      },
    });
    if (!target) return;

    await tx.blueprintAccount.delete({ where: { id: target.id } });

    // Re-index following accounts down by 1
    const following = await tx.blueprintAccount.findMany({
      where: { userId: sessionUser.id, accountIndex: { gt: accountIndex } },
      orderBy: { accountIndex: "asc" },
    });
    for (const acct of following) {
      await tx.blueprintAccount.update({
        where: { id: acct.id },
        data: { accountIndex: acct.accountIndex - 1 },
      });
    }
  });

  const accounts = await listAccounts(sessionUser.id);
  return NextResponse.json({ success: true, accounts });
});
