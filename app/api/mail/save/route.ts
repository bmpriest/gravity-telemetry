import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getRandomCharacters, truncateOps, untruncateOps } from "@/utils/functions";
import type { SaveTemplate, TruncatedOp } from "@/utils/types";
import type { Op } from "quill";

interface Body {
  uid: string;
  accessToken: string;
  template: SaveTemplate;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;

    const user = await prisma.user.findUnique({
      where: { uid: body.uid },
      include: { savedMails: true },
    });

    if (!user) throw new Error("User not found.");
    if (user.accessToken !== body.accessToken) throw new Error("Invalid credentials.");

    const template = body.template;
    if (!template.ops.every((op) => "insert" in op)) throw new Error("Invalid ops.");
    if (template.name.length > 50) throw new Error("Names can only be 50 characters long.");
    if (user.savedMails.length >= 30) throw new Error("You can only have 30 saved mails. Try deleting some.");

    const existing = user.savedMails.find((m) => m.name === template.name);
    const today = new Date().toISOString().slice(0, 10);
    const id = existing ? existing.id : getRandomCharacters(10);
    const createdAt = existing ? existing.createdAt : today;

    const truncatedOps = JSON.stringify(truncateOps(template.ops as Op[]));

    await prisma.savedMail.upsert({
      where: { id },
      update: { ops: truncatedOps, lastSaved: today, name: template.name },
      create: { id, name: template.name, ops: truncatedOps, lastSaved: today, createdAt, userId: body.uid },
    });

    // Return all mails with untruncated ops, newest first
    const allMails = await prisma.savedMail.findMany({
      where: { userId: body.uid },
      orderBy: { lastSaved: "desc" },
    });

    const outcomeMails = allMails.map((m) => ({
      ...m,
      ops: untruncateOps(JSON.parse(m.ops) as TruncatedOp[]),
    }));

    const newMail = outcomeMails.find((m) => m.id === id) ?? null;

    return NextResponse.json({ success: true, error: null, content: newMail, outcomeMails });
  } catch (error) {
    console.error(error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Something went wrong. Try again later.",
      content: null,
      outcomeMails: null,
    });
  }
}
