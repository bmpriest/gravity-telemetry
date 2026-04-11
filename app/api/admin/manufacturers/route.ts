/**
 * GET  /api/admin/manufacturers — list every manufacturer ordered by name. The
 *                                 admin Ship form fetches this to populate its
 *                                 dropdown so the list reflects whatever the
 *                                 admin has added at runtime.
 * POST /api/admin/manufacturers — create a new manufacturer. Names must be
 *                                 unique; the route returns the new id so the
 *                                 form can immediately select it.
 *
 * Both endpoints are admin-only via requireAdmin().
 */

import type { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { handle } from "@/lib/api";
import { requireAdmin } from "@/lib/session";

interface CreateBody {
  name: string;
}

export async function GET() {
  return handle(async () => {
    await requireAdmin();
    const data = await prisma.manufacturer.findMany({ orderBy: { name: "asc" } });
    return { data };
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    await requireAdmin();
    const body = (await req.json()) as CreateBody;

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) throw new Error("name is required.");
    if (name.length > 100) throw new Error("name must be 100 characters or fewer.");

    const existing = await prisma.manufacturer.findUnique({ where: { name } });
    if (existing) throw new Error(`Manufacturer "${name}" already exists.`);

    const created = await prisma.manufacturer.create({ data: { name } });
    return { id: created.id, name: created.name };
  });
}
