import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { jsonError, withErrorHandler } from "@/lib/httpError";

const patchSchema = z
  .object({
    isAdmin: z.boolean().optional(),
    resetPassword: z.string().min(8).max(256).optional(),
  })
  .refine((d) => d.isAdmin !== undefined || d.resetPassword !== undefined, {
    message: "Provide isAdmin or resetPassword",
  });

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withErrorHandler(async (req: NextRequest, ctx: Ctx) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  if (!id) return jsonError(400, "Missing id");

  const body: unknown = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const data = parsed.data;

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return jsonError(404, "User not found");

  // Don't allow demoting yourself.
  if (data.isAdmin === false && target.id === admin.id) {
    return jsonError(400, "Cannot revoke your own admin");
  }

  const update: { isAdmin?: boolean; passwordHash?: string; mustChangePassword?: boolean } = {};
  if (data.isAdmin !== undefined) update.isAdmin = data.isAdmin;
  if (data.resetPassword !== undefined) {
    update.passwordHash = await hashPassword(data.resetPassword);
    update.mustChangePassword = true;
    // Invalidate all existing sessions for the user.
    await prisma.session.deleteMany({ where: { userId: id } });
  }
  await prisma.user.update({ where: { id }, data: update });
  return NextResponse.json({ success: true });
});

export const DELETE = withErrorHandler(async (_req: NextRequest, ctx: Ctx) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  if (!id) return jsonError(400, "Missing id");
  if (id === admin.id) return jsonError(400, "Cannot delete your own account");

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return jsonError(404, "User not found");

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
