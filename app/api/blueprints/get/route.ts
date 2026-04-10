import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { jsonError, withErrorHandler } from "@/lib/httpError";

const getSchema = z.object({
  accountIndex: z.number().int().min(0).max(9),
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const sessionUser = await requireUser();

  const body: unknown = await req.json();
  const parsed = getSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "Invalid input");
  }

  const account = await prisma.blueprintAccount.findUnique({
    where: {
      userId_accountIndex: {
        userId: sessionUser.id,
        accountIndex: parsed.data.accountIndex,
      },
    },
    include: {
      shipUnlocks: {
        include: {
          moduleUnlocks: { include: { module: { select: { system: true } } } },
        },
      },
      unassignedTp: true,
    },
  });

  if (!account) {
    return NextResponse.json({ success: true, account: null });
  }

  const ships = account.shipUnlocks.map((u) => ({
    shipId: u.shipId,
    techPoints: u.techPoints,
    moduleSystems: u.moduleUnlocks.map((m) => m.module.system),
  }));

  const unassignedTp: Record<string, number> = {};
  for (const u of account.unassignedTp) {
    unassignedTp[u.shipType] = u.techPoints;
  }

  return NextResponse.json({
    success: true,
    account: {
      accountIndex: account.accountIndex,
      accountName: account.accountName,
      ships,
      unassignedTp,
      lastSaved: account.bpLastSaved,
    },
  });
});
