import "server-only";
import prisma from "@/lib/prisma";

export type AccountSummary = {
  accountIndex: number;
  accountName: string;
  lastSaved: Date;
};

export async function listAccounts(userId: string): Promise<AccountSummary[]> {
  const accounts = await prisma.blueprintAccount.findMany({
    where: { userId },
    orderBy: { accountIndex: "asc" },
    select: { accountIndex: true, accountName: true, bpLastSaved: true },
  });
  return accounts.map((a) => ({
    accountIndex: a.accountIndex,
    accountName: a.accountName,
    lastSaved: a.bpLastSaved,
  }));
}
