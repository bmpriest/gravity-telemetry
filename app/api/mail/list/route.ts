import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { withErrorHandler } from "@/lib/httpError";
import { untruncateOps } from "@/utils/functions";
import type { TruncatedOp } from "@/utils/types";

export const GET = withErrorHandler(async () => {
  const sessionUser = await requireUser();

  const mails = await prisma.savedMail.findMany({
    where: { userId: sessionUser.id },
    orderBy: { lastSaved: "desc" },
  });

  const expanded = mails.map((m) => ({
    ...m,
    ops: untruncateOps(JSON.parse(m.ops) as TruncatedOp[]),
  }));

  return NextResponse.json({ success: true, mails: expanded });
});
