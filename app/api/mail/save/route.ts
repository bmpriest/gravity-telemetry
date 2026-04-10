import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { jsonError, withErrorHandler } from "@/lib/httpError";
import { truncateOps, untruncateOps } from "@/utils/functions";
import type { Op } from "quill/core";
import type { TruncatedOp } from "@/utils/types";

const opSchema = z
  .object({ insert: z.unknown() })
  .passthrough();

const saveSchema = z.object({
  template: z.object({
    name: z.string().min(1).max(50),
    ops: z.array(opSchema).min(1),
  }),
});

const MAX_MAILS = 30;

export const POST = withErrorHandler(async (req: NextRequest) => {
  const sessionUser = await requireUser();

  const body: unknown = await req.json();
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid mail");
  }

  const { template } = parsed.data;
  const ops = template.ops as unknown as Op[];

  const existing = await prisma.savedMail.findUnique({
    where: { userId_name: { userId: sessionUser.id, name: template.name } },
  });

  if (!existing) {
    const count = await prisma.savedMail.count({ where: { userId: sessionUser.id } });
    if (count >= MAX_MAILS) {
      return jsonError(
        400,
        `You can only have ${String(MAX_MAILS)} saved mails. Try deleting some.`
      );
    }
  }

  const truncatedOps = JSON.stringify(truncateOps(ops));

  const saved = existing
    ? await prisma.savedMail.update({
        where: { id: existing.id },
        data: { ops: truncatedOps },
      })
    : await prisma.savedMail.create({
        data: {
          userId: sessionUser.id,
          name: template.name,
          ops: truncatedOps,
        },
      });

  const all = await prisma.savedMail.findMany({
    where: { userId: sessionUser.id },
    orderBy: { lastSaved: "desc" },
  });

  const expanded = all.map((m) => ({
    ...m,
    ops: untruncateOps(JSON.parse(m.ops) as TruncatedOp[]),
  }));
  const newMail = expanded.find((m) => m.id === saved.id) ?? null;

  return NextResponse.json({
    success: true,
    content: newMail,
    outcomeMails: expanded,
  });
});
