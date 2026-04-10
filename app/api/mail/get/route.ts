import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { jsonError, withErrorHandler } from "@/lib/httpError";
import { untruncateOps } from "@/utils/functions";
import type { TruncatedOp } from "@/utils/types";

const getSchema = z.object({ mailId: z.string().min(1) });

export const POST = withErrorHandler(async (req: NextRequest) => {
  const sessionUser = await requireUser();

  const body: unknown = await req.json();
  const parsed = getSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, "Invalid input");

  const mail = await prisma.savedMail.findFirst({
    where: { id: parsed.data.mailId, userId: sessionUser.id },
  });
  if (!mail) return jsonError(404, "Mail not found");

  const ops = untruncateOps(JSON.parse(mail.ops) as TruncatedOp[]);
  return NextResponse.json({ success: true, content: { ...mail, ops } });
});
