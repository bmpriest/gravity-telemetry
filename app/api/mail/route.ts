/**
 * Mail API — replaces legacy /api/mail/{save,get,delete}.
 *
 * Auth via session cookie. SavedMail.ops is the *only* JSON column in the new
 * schema (Quill ops are inherently rich-text deltas with no useful relational
 * shape), so we still serialize via truncateOps/untruncateOps on save/load.
 *
 * GET /api/mail        — list current user's mails (newest first)
 * POST /api/mail       — upsert by name (create or update an existing template)
 */

import type { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { handle } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { truncateOps, untruncateOps } from "@/utils/functions";
import type { SaveTemplate, TruncatedOp } from "@/utils/types";
import type { Op } from "quill";

function inflate(mail: { id: string; name: string; ops: string; lastSaved: Date; createdAt: Date; userId: string }) {
  return {
    id: mail.id,
    name: mail.name,
    ops: untruncateOps(JSON.parse(mail.ops) as TruncatedOp[]),
    lastSaved: mail.lastSaved.toISOString(),
    createdAt: mail.createdAt.toISOString(),
  };
}

export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    const mails = await prisma.savedMail.findMany({
      where: { userId: user.id },
      orderBy: { lastSaved: "desc" },
    });
    return { data: mails.map(inflate) };
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser();
    const body = (await req.json()) as { template: SaveTemplate };
    const template = body.template;

    if (!template?.name || template.name.length > 50) throw new Error("Names can only be 50 characters long.");
    if (!Array.isArray(template.ops) || !template.ops.every((op) => "insert" in op)) throw new Error("Invalid ops.");

    const count = await prisma.savedMail.count({ where: { userId: user.id } });
    const existing = await prisma.savedMail.findFirst({ where: { userId: user.id, name: template.name } });
    if (!existing && count >= 30) throw new Error("You can only have 30 saved mails. Try deleting some.");

    const truncated = JSON.stringify(truncateOps(template.ops as Op[]));

    const saved = existing
      ? await prisma.savedMail.update({
          where: { id: existing.id },
          data: { ops: truncated, lastSaved: new Date(), name: template.name },
        })
      : await prisma.savedMail.create({
          data: { name: template.name, ops: truncated, userId: user.id },
        });

    const all = await prisma.savedMail.findMany({
      where: { userId: user.id },
      orderBy: { lastSaved: "desc" },
    });
    return { data: all.map(inflate), saved: inflate(saved) };
  });
}
