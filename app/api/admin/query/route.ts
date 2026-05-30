/**
 * Rudimentary read-only SQL view for data analysis. Accepts a single SELECT (or
 * WITH … SELECT) statement and returns the result rows. Anything that could
 * mutate is rejected, and a row cap is applied as a backstop.
 */

import type { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { handle } from "@/lib/api";
import { requireAdmin } from "@/lib/session";

const FORBIDDEN = /\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|comment|copy|vacuum|reindex|merge|call|do|set)\b/i;

export async function POST(req: NextRequest) {
  return handle(async () => {
    await requireAdmin();
    const { sql } = (await req.json()) as { sql?: string };
    if (typeof sql !== "string" || sql.trim().length === 0) throw new Error("A SQL query is required.");

    const trimmed = sql.trim().replace(/;\s*$/, "");
    if (trimmed.includes(";")) throw new Error("Only a single statement is allowed.");

    const lower = trimmed.toLowerCase();
    if (!lower.startsWith("select") && !lower.startsWith("with")) {
      throw new Error("Only SELECT / WITH queries are allowed.");
    }
    if (FORBIDDEN.test(trimmed)) throw new Error("Only read-only queries are allowed.");

    // Cap rows with an outer LIMIT wrapper as a backstop against huge results.
    const wrapped = `SELECT * FROM (${trimmed}) AS _q LIMIT 1000`;
    const rows = (await prisma.$queryRawUnsafe(wrapped)) as Record<string, unknown>[];

    // BigInt (e.g. count(*)) isn't JSON-serializable — stringify it.
    const safe = rows.map((r) => {
      const o: Record<string, unknown> = {};
      for (const k of Object.keys(r)) o[k] = typeof r[k] === "bigint" ? Number(r[k]) : r[k];
      return o;
    });

    const columns = safe.length > 0 ? Object.keys(safe[0]) : [];
    return { columns, rows: safe, count: safe.length };
  });
}
