/**
 * Blueprint API — normalized replacement for the legacy
 * /api/blueprints/{save,get,delete} routes which encoded the entire account
 * as a JSON blob in BlueprintAccount.data. The new routes round-trip a typed
 * structure that matches the relational schema directly.
 *
 * Shape returned by GET / accepted by POST:
 *
 *   {
 *     accountIndex: number,
 *     accountName: string,
 *     lastSaved: string (ISO),
 *     unassignedTp: [number x 9],   // 9 fixed tech-point pools
 *     ships: [
 *       {
 *         shipId: number,
 *         unlocked: boolean,
 *         techPoints: number,
 *         mirrorTechPoints: boolean,
 *         modules: [{ moduleId: number, unlocked: boolean }, ...]
 *       },
 *       ...
 *     ],
 *     userFragments?: [{ fragmentId: number, quantityOwned: number }, ...]
 *   }
 *
 * Auth is via the session cookie — no more uid/accessToken in the body.
 */

import type { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { handle } from "@/lib/api";
import { requireUser } from "@/lib/session";

interface ModuleInput { moduleId: number; unlocked: boolean }
interface ShipInput {
  shipId: number;
  unlocked: boolean;
  techPoints: number;
  mirrorTechPoints: boolean;
  modules: ModuleInput[];
}
interface FragmentInput {
  fragmentId: number;
  quantityOwned: number;
}
interface AccountInput {
  accountIndex: number;
  accountName: string;
  unassignedTp: [number, number, number, number, number, number, number, number, number];
  ships: ShipInput[];
  userFragments?: FragmentInput[];
}

const TP_COLUMNS = [
  "unassignedTp0", "unassignedTp1", "unassignedTp2",
  "unassignedTp3", "unassignedTp4", "unassignedTp5",
  "unassignedTp6", "unassignedTp7", "unassignedTp8",
] as const;

function tpRowToArray(row: Record<string, number>): number[] {
  return TP_COLUMNS.map((col) => row[col] ?? 0);
}

function tpArrayToRow(arr: readonly number[]): Record<string, number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: any = {};
  TP_COLUMNS.forEach((col, i) => { out[col] = arr[i] ?? 0; });
  return out;
}

async function loadAccountsForUser(userId: string) {
  const accounts = await prisma.blueprintAccount.findMany({
    where: { userId },
    orderBy: { accountIndex: "asc" },
    include: {
      shipBlueprints: {
        include: { moduleBlueprints: true },
      },
      userFragments: true,
    },
  });

  return accounts.map((a) => ({
    accountIndex: a.accountIndex,
    accountName: a.accountName,
    lastSaved: a.lastSaved.toISOString(),
    unassignedTp: tpRowToArray(a as unknown as Record<string, number>),
    ships: a.shipBlueprints.map((sb) => ({
      shipId: sb.shipId,
      unlocked: sb.unlocked,
      techPoints: sb.techPoints,
      mirrorTechPoints: sb.mirrorTechPoints,
      modules: sb.moduleBlueprints.map((mb) => ({
        moduleId: mb.moduleId,
        unlocked: mb.unlocked,
      })),
    })),
    userFragments: a.userFragments.map((uf) => ({
      fragmentId: uf.fragmentId,
      quantityOwned: uf.quantityOwned,
    })),
  }));
}

export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    return { data: await loadAccountsForUser(user.id) };
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser();
    const body = (await req.json()) as AccountInput;

    if (typeof body.accountIndex !== "number" || body.accountIndex < 0 || body.accountIndex > 9) {
      throw new Error("You can only have 10 saved accounts at the moment.");
    }
    if (typeof body.accountName !== "string" || body.accountName.length === 0) throw new Error("Account name is required.");
    if (body.accountName.length > 50) throw new Error("Names can only be 50 characters long.");
    if (!Array.isArray(body.unassignedTp) || body.unassignedTp.length !== 9) throw new Error("unassignedTp must be an array of 9 integers.");
    if (!Array.isArray(body.ships)) throw new Error("ships must be an array.");

    // Upsert the account, then replace its ship/module blueprint subtree.
    // Wiping + reinserting beats fine-grained diffs because the autosave path
    // already debounces and the per-account dataset is small (~150 ships max).
    const account = await prisma.blueprintAccount.upsert({
      where: { userId_accountIndex: { userId: user.id, accountIndex: body.accountIndex } },
      update: {
        accountName: body.accountName,
        lastSaved: new Date(),
        ...tpArrayToRow(body.unassignedTp),
      },
      create: {
        userId: user.id,
        accountIndex: body.accountIndex,
        accountName: body.accountName,
        ...tpArrayToRow(body.unassignedTp),
      },
    });

    // Replace ship/module blueprints. ShipBlueprint cascades to ModuleBlueprint.
    await prisma.shipBlueprint.deleteMany({ where: { accountId: account.id } });

    for (const ship of body.ships) {
      const sb = await prisma.shipBlueprint.create({
        data: {
          accountId: account.id,
          shipId: ship.shipId,
          unlocked: ship.unlocked,
          techPoints: ship.techPoints,
          mirrorTechPoints: ship.mirrorTechPoints,
        },
      });
      if (ship.modules.length > 0) {
        await prisma.moduleBlueprint.createMany({
          data: ship.modules.map((m) => ({
            shipBlueprintId: sb.id,
            moduleId: m.moduleId,
            unlocked: m.unlocked,
          })),
        });
      }
    }

    if (body.userFragments) {
      await prisma.userFragment.deleteMany({ where: { accountId: account.id } });
      if (body.userFragments.length > 0) {
        await prisma.userFragment.createMany({
          data: body.userFragments.map((f) => ({
            accountId: account.id,
            fragmentId: f.fragmentId,
            quantityOwned: f.quantityOwned,
          })),
        });
      }
    }

    return { data: await loadAccountsForUser(user.id) };
  });
}

