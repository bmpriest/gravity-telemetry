import prisma from "@/lib/prisma";
import { handle } from "@/lib/api";
import { requireUser } from "@/lib/session";

/**
 * DELETE /api/blueprints/:index — removes the blueprint account at the given
 * index, then re-numbers the accounts that came after it so indices stay
 * contiguous (the UI relies on this for the "tabs" UX).
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ index: string }> }) {
  return handle(async () => {
    const user = await requireUser();
    const { index } = await params;
    const accountIndex = Number(index);
    if (!Number.isInteger(accountIndex) || accountIndex < 0) throw new Error("Invalid account index.");

    await prisma.$transaction(async (tx) => {
      const target = await tx.blueprintAccount.findUnique({
        where: { userId_accountIndex: { userId: user.id, accountIndex } },
      });
      if (!target) throw new Error("Account not found.");

      await tx.blueprintAccount.delete({ where: { id: target.id } });

      // Shift down everything past the deleted index. We can't update the unique
      // (userId, accountIndex) column in a single bulk update because each row
      // would briefly collide with the next one — Postgres allows it inside a
      // single statement, but Prisma's typed `updateMany` doesn't expose that.
      // The set is at most ~10 rows, so the loop is fine.
      const following = await tx.blueprintAccount.findMany({
        where: { userId: user.id, accountIndex: { gt: accountIndex } },
        orderBy: { accountIndex: "asc" },
      });
      for (const row of following) {
        await tx.blueprintAccount.update({
          where: { id: row.id },
          data: { accountIndex: row.accountIndex - 1 },
        });
      }
    });

    return {};
  });
}
