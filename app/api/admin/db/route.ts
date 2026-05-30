/**
 * Generic admin table editor API. Supports read / update / create / delete of
 * scalar fields on a whitelisted set of catalogue tables (see lib/adminTables).
 *
 *   GET    /api/admin/db?table=Ship&page=1&pageSize=25&q=...   → { columns, rows, total }
 *   PATCH  /api/admin/db?table=Ship&id=123  body { field: value, … }
 *   POST   /api/admin/db?table=Ship         body { field: value, … }   → { id }
 *   DELETE /api/admin/db?table=Ship&id=123
 */

import type { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { handle } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { ADMIN_TABLES, getColumns, isAllowedTable, modelAccessor, buildWriteData } from "@/lib/adminTables";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function model(table: string): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (prisma as any)[modelAccessor(table)];
}

function requireTable(req: NextRequest): string {
  const table = req.nextUrl.searchParams.get("table") ?? "";
  if (!isAllowedTable(table)) throw new Error(`Unknown or non-editable table: ${table}`);
  return table;
}

export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireAdmin();
    const table = requireTable(req);
    const columns = getColumns(table);

    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(200, Math.max(1, parseInt(req.nextUrl.searchParams.get("pageSize") ?? "25", 10)));
    const q = (req.nextUrl.searchParams.get("q") ?? "").trim();

    // Search across string columns when a query is supplied.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let where: any = undefined;
    if (q) {
      const stringCols = columns.filter((c) => c.type === "String" && !c.isId);
      if (stringCols.length > 0) {
        where = { OR: stringCols.map((c) => ({ [c.name]: { contains: q, mode: "insensitive" } })) };
      }
    }

    const [rows, total] = await Promise.all([
      model(table).findMany({ where, orderBy: { id: "asc" }, skip: (page - 1) * pageSize, take: pageSize }),
      model(table).count({ where }),
    ]);

    // Only return scalar columns (strip relation arrays if any sneak in).
    const keep = new Set(columns.map((c) => c.name));
    const cleanRows = rows.map((r: Record<string, unknown>) => {
      const o: Record<string, unknown> = {};
      for (const k of Object.keys(r)) if (keep.has(k)) o[k] = r[k];
      return o;
    });

    return { columns, rows: cleanRows, total, page, pageSize, tables: ADMIN_TABLES };
  });
}

export async function PATCH(req: NextRequest) {
  return handle(async () => {
    await requireAdmin();
    const table = requireTable(req);
    const id = Number(req.nextUrl.searchParams.get("id"));
    if (!Number.isFinite(id)) throw new Error("A numeric id is required.");
    const raw = (await req.json()) as Record<string, unknown>;
    const data = buildWriteData(table, raw);
    await model(table).update({ where: { id }, data });
    return {};
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    await requireAdmin();
    const table = requireTable(req);
    const raw = (await req.json()) as Record<string, unknown>;
    const data = buildWriteData(table, raw);
    const created = await model(table).create({ data });
    return { id: created.id };
  });
}

export async function DELETE(req: NextRequest) {
  return handle(async () => {
    await requireAdmin();
    const table = requireTable(req);
    const id = Number(req.nextUrl.searchParams.get("id"));
    if (!Number.isFinite(id)) throw new Error("A numeric id is required.");
    await model(table).delete({ where: { id } });
    return {};
  });
}
