import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getObjectValue } from "@/utils/functions";
import type { BlueprintAllShip } from "@/utils/blueprints";

interface Body {
  uid: string;
  accessToken: string;
  blueprints: BlueprintAllShip[] | null;
  unassignedTp: [number, number, number, number, number, number, number, number, number];
  accountIndex: number;
  accountName: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;

    if (body.accountIndex > 9) throw new Error("You can only have 10 saved accounts at the moment. Sorry!");

    const user = await prisma.user.findUnique({ where: { uid: body.uid } });
    if (!user) throw new Error("User not found.");
    if (user.accessToken !== body.accessToken) throw new Error("Invalid credentials.");

    // Check if this is a rename-only (no blueprints sent) and the account exists
    const existing = await prisma.blueprintAccount.findUnique({
      where: { userId_accountIndex: { userId: body.uid, accountIndex: body.accountIndex } },
    });
    if (!body.blueprints && !existing) throw new Error("Account not saved.");

    const today = new Date().toISOString().slice(0, 10);

    let ships: Record<number, (string | number)[]>[] | null = null;
    if (body.blueprints) {
      ships = body.blueprints
        .map((ship) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const s = ship as any;
          if (!s.unlocked) return { [s.id]: [] };
          if (!("modules" in s)) return { [s.id]: [s.variant, s.techPoints] };
          return { [s.id]: [s.variant, s.techPoints, ...s.modules.filter((m: any) => m.unlocked).map((m: any) => m.system)] };
        })
        .filter((obj) => (getObjectValue(obj) as (string | number)[]).length > 0) as Record<number, (string | number)[]>[];

      ships.unshift({ 999: body.unassignedTp });
    }

    const dataToSave = ships
      ? JSON.stringify(ships)
      : existing!.data;

    await prisma.blueprintAccount.upsert({
      where: { userId_accountIndex: { userId: body.uid, accountIndex: body.accountIndex } },
      update: { accountName: body.accountName, data: dataToSave },
      create: {
        userId: body.uid,
        accountIndex: body.accountIndex,
        accountName: body.accountName,
        data: dataToSave,
      },
    });

    await prisma.user.update({
      where: { uid: body.uid },
      data: { bpLastSaved: today },
    });

    // Return all blueprint accounts for this user
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
