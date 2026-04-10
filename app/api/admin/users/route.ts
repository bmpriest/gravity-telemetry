import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { jsonError, withErrorHandler } from "@/lib/httpError";

const createUserSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-zA-Z0-9_.-]+$/, "Username may contain only letters, digits, _.-"),
  password: z.string().min(8).max(256),
  isAdmin: z.boolean().default(false),
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  await requireAdmin();
  const body: unknown = await req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const { username, password, isAdmin } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return jsonError(409, "Username already taken");

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      username,
      passwordHash,
      isAdmin,
      mustChangePassword: true,
    },
  });
  return NextResponse.json({ success: true, user: { id: user.id } });
});
