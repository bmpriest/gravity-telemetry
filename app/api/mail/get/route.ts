import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { untruncateOps } from "@/utils/functions";
import type { TruncatedOp } from "@/utils/types";

interface Body {
  uid: string;
  mailId: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;

    const mail = await prisma.savedMail.findFirst({
      where: { id: body.mailId, userId: body.uid },
    });

    if (!mail) throw new Error("Mail not found.");

    const ops = untruncateOps(JSON.parse(mail.ops) as TruncatedOp[]);

    return NextResponse.json({ success: true, error: null, content: { ...mail, ops } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Something went wrong. Try again later.",
      content: null,
    });
  }
}
