/**
 * PATCH  /api/admin/manufacturers/:id — rename a manufacturer. Updating the FK
 *                                       on Ship is not necessary because the
 *                                       relation is by id, not name.
 * DELETE /api/admin/manufacturers/:id — remove a manufacturer. Refuses if any
 *                                       Ship still references it; the admin has
 *                                       to reassign or delete those ships
 *                                       first. The DB-level FK has ON DELETE
 *                                       RESTRICT as a backstop, but we check
 *                                       in app code so the error message names
 *                                       the offending count.
 */

import type { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { handle } from "@/lib/api";
import { requireAdmin } from "@/lib/session";

interface UpdateBody {
  name?: string;
}

function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid manufacturer id.");
  return id;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await requireAdmin();
    const { id: idRaw } = await params;
    const id = parseId(idRaw);

    const body = (await req.json()) as UpdateBody;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) throw new Error("name is required.");
    if (name.length > 100) throw new Error("name must be 100 characters or fewer.");

    const collision = await prisma.manufacturer.findUnique({ where: { name } });
    if (collision && collision.id !== id) throw new Error(`Manufacturer "${name}" already exists.`);

    await prisma.manufacturer.update({ where: { id }, data: { name } });
    return {};
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await requireAdmin();
    const { id: idRaw } = await params;
    const id = parseId(idRaw);

    const referenceCount = await prisma.ship.count({ where: { manufacturerId: id } });
    if (referenceCount > 0) {
      throw new Error(`Cannot delete: ${referenceCount} ship(s) still reference this manufacturer.`);
    }

    await prisma.manufacturer.delete({ where: { id } });
    return {};
  });
}
