import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getOrigin } from "@/lib/origins";
import { untruncateOps } from "@/utils/functions";
import type { TruncatedOp } from "@/utils/types";

interface Body {
  uid: string;
  accessToken: string;
  updateOrigin: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;

    const user = await prisma.user.findUnique({
      where: { uid: body.uid },
      include: { savedMails: true, blueprintAccounts: { orderBy: { accountIndex: "asc" } } },
    });

    if (!user) throw new Error("User not found.");
    if (user.accessToken !== body.accessToken) throw new Error("Invalid credentials.");

    const today = new Date().toISOString().slice(0, 10);
    const origin = body.updateOrigin ? getOrigin(process.env.NEXT_PUBLIC_BASE_URL ?? "") : user.origin;

    await prisma.user.update({
      where: { uid: body.uid },
      data: { lastLoggedIn: today, origin },
    });

    // Untruncate mail ops before returning
    const savedMails = user.savedMails.map((mail) => ({
      ...mail,
      ops: untruncateOps(JSON.parse(mail.ops) as TruncatedOp[]),
    }));

    const blueprints = user.blueprintAccounts.map((a) => ({
      [a.accountName]: JSON.parse(a.data) as Record<string, (string | number)[]>[],
    }));

    return NextResponse.json({
      success: true,
      error: null,
      content: {
        uid: user.uid,
        accessToken: user.accessToken,
        createdAt: user.createdAt,
        lastLoggedIn: today,
        bpLastSaved: user.bpLastSaved,
        origin,
        savedMails,
        blueprints,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Something went wrong. Try again later.",
      content: null,
    });
  }
}
