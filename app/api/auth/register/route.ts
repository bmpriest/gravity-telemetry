import type { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { createSession, describeRequest, isValidPassword, isValidUsername, toSessionUser } from "@/lib/session";
import { handle } from "@/lib/api";

interface Body {
  username: string;
  password: string;
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const body = (await req.json()) as Body;
    if (!isValidUsername(body.username)) throw new Error("Username must be 3-32 characters and only contain letters, digits, '.', '_', or '-'.");
    if (!isValidPassword(body.password)) throw new Error("Password must be at least 8 characters.");

    const existing = await prisma.user.findUnique({ where: { username: body.username } });
    if (existing) throw new Error("That username is already taken.");

    const user = await prisma.user.create({
      data: {
        username: body.username,
        passwordHash: await hashPassword(body.password),
        lastLoggedIn: new Date(),
      },
    });

    await createSession(user.id, describeRequest(req));
    return { user: toSessionUser(user) };
  });
}
