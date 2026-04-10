import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireUser, verifyPassword, hashPassword } from "@/lib/auth";
import { jsonError, withErrorHandler } from "@/lib/httpError";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: z.string().min(8).max(256),
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const sessionUser = await requireUser();

  const body: unknown = await req.json();
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { currentPassword, newPassword } = parsed.data;
  if (currentPassword === newPassword) {
    return jsonError(400, "New password must differ from current password");
  }

  const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
  if (!user) return jsonError(401, "User not found");

  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) return jsonError(401, "Current password is incorrect");

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: false },
  });

  return NextResponse.json({ success: true });
});
