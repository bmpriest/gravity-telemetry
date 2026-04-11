/**
 * GET /api/admin/users — paginated list of users for the admin password-reset
 * UI. Returns the safe `SessionUser`-style projection (no password hashes).
 */

import type { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { handle } from "@/lib/api";
import { requireAdmin } from "@/lib/session";

export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireAdmin();

    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? "25")));
    const search = url.searchParams.get("q")?.trim();

    const where = search
      ? { username: { contains: search, mode: "insensitive" as const } }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { username: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true, username: true, role: true,
          mustChangePassword: true, createdAt: true, lastLoggedIn: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return { data: users, page, pageSize, total };
  });
}
