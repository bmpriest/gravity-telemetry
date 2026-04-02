import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getObjectKey, getObjectValue } from "@/utils/functions";

interface Body {
  uid: string;
  accountIndex: number;
}

export async function POST(req: NextRequest) {
  let blueprints: (string | number)[][] = [];
  let lastSaved: string | null = null;
  let accountName: string | null = null;
  let unassignedTp: number[] | null = null;

  try {
    const body = (await req.json()) as Body;

    const [user, account] = await Promise.all([
      prisma.user.findUnique({ where: { uid: body.uid }, select: { bpLastSaved: true } }),
      prisma.blueprintAccount.findUnique({
        where: { userId_accountIndex: { userId: body.uid, accountIndex: body.accountIndex } },
      }),
    ]);

    if (!user) throw new Error("User not found.");
    if (!user.bpLastSaved || !account) {
      return NextResponse.json({ success: false, error: "No blueprints found.", content: null, lastSaved: null, accountName: null, unassignedTp: null });
    }

    const ships = JSON.parse(account.data) as Record<number, (string | number)[]>[];
    if (ships.length === 0) throw new Error("No blueprints found.");

    if (Number(getObjectKey(ships[0])) === 999) {
      const [unassignedTpEntry] = ships.splice(0, 1);
      unassignedTp = getObjectValue(unassignedTpEntry) as number[];
    }

    accountName = account.accountName;
    blueprints = ships.map((ship) => [Number(getObjectKey(ship)), getObjectValue(ship)].flat());
    lastSaved = user.bpLastSaved;
  } catch (error) {
    console.error(error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Something went wrong. Try again later.",
      content: null,
      lastSaved: null,
      accountName: null,
      unassignedTp: null,
    });
  }

  return NextResponse.json({ success: true, error: null, content: blueprints, lastSaved, accountName, unassignedTp });
}
