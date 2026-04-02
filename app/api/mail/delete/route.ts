import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { untruncateOps } from "@/utils/functions";
import type { TruncatedOp } from "@/utils/types";

interface Body {
  uid: string;
  accessToken: string;
  mailId: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;

    const user = await prisma.user.findUnique({ where: { uid: body.uid } });
    if (!user) throw new Error("User not found.");
    if (user.accessToken !== body.accessToken) throw new Error("Invalid credentials.");

    const mail = await prisma.savedMail.findFirst({ where: { id: body.mailId, userId: body.uid } });
    if (!mail) throw new Error("Mail not found.");

    await prisma.savedMail.delete({ where: { id: body.mailId } });

    const remaining = await prisma.savedMail.findMany({
      where: { userId: body.uid },
      orderBy: { lastSaved: "desc" },
    });

    const content = remaining.map((m) => ({
      ...m,
      ops: untruncateOps(JSON.parse(m.ops) as TruncatedOp[]),
    }));

    return NextResponse.json({ success: true, error: null, content });
  } catch (error) {
    console.error(error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Something went wrong. Try again later.",
      content: null,
    });
  }
}
