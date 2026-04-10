import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyPassword, createSession } from "@/lib/auth";
import { jsonError, withErrorHandler } from "@/lib/httpError";

const loginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(256),
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body: unknown = await req.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "Invalid login payload");
  }

  const { username, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return jsonError(401, "Invalid credentials");

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return jsonError(401, "Invalid credentials");

  await createSession(user.id);

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
      mustChangePassword: user.mustChangePassword,
    },
  });
});
