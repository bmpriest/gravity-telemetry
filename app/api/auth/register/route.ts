import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { hashPassword, createSession } from "@/lib/auth";
import { jsonError, withErrorHandler } from "@/lib/httpError";

const registerSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-zA-Z0-9_.-]+$/, "Username may contain only letters, digits, _.-"),
  password: z.string().min(8).max(256),
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  if (process.env.ALLOW_PUBLIC_REGISTRATION !== "true") {
    return jsonError(403, "Public registration is disabled");
  }

  const body: unknown = await req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { username, password } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return jsonError(409, "Username already taken");

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      username,
      passwordHash,
      isAdmin: false,
      mustChangePassword: false,
    },
  });

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
