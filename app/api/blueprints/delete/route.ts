import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface Body {
  uid: string;
  accessToken: string;
  accountIndex: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;

    const user = await prisma.user.findUnique({ where: { uid: body.uid } });
    if (!user) throw new Error("User not found.");
    if (user.accessToken !== body.accessToken) throw new Error("Invalid credentials.");

    // Delete the target account
    await prisma.blueprintAccount.delete({
      where: { userId_accountIndex: { userId: body.uid, accountIndex: body.accountIndex } },
    });

    // Re-index accounts that come after the deleted one
    const following = await prisma.blueprintAccount.findMany({
      where: { userId: body.uid, accountIndex: { gt: body.accountIndex } },
      orderBy: { accountIndex: "asc" },
    });

    for (const account of following) {
      await prisma.blueprintAccount.update({
        where: { id: account.id },
        data: { accountIndex: account.accountIndex - 1 },
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    await prisma.user.update({ where: { uid: body.uid }, data: { bpLastSaved: today } });

    const allAccounts = await prisma.blueprintAccount.findMany({
      where: { userId: body.uid },
      orderBy: { accountIndex: "asc" },
    });

    const newBlueprints = allAccounts.map((a) => ({
      [a.accountName]: JSON.parse(a.data) as Record<string, (string | number)[]>[],
    }));
    return NextResponse.json({ success: true, error: null, newBlueprints });
  } catch (error) {
    console.error(error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Something went wrong. Try again later.",
      newBlueprints: null,
    });
  }
}
