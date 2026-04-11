import type { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createSession, describeRequest, toSessionUser } from "@/lib/session";
import { handle } from "@/lib/api";

interface Body {
  username: string;
  password: string;
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const body = (await req.json()) as Body;

    const user = await prisma.user.findUnique({ where: { username: body.username } });
    // Constant-time-ish: always run a hash compare even if user is missing,
    // so timing doesn't reveal whether the username exists. We compare against
    // a fixed dummy hash in that case.
    const hash = user?.passwordHash ?? "$2a$12$0000000000000000000000000000000000000000000000000000";
    const ok = await verifyPassword(body.password, hash);
    if (!user || !ok) throw new Error("Invalid username or password.");

    await prisma.user.update({ where: { id: user.id }, data: { lastLoggedIn: new Date() } });
    await createSession(user.id, describeRequest(req));
    return { user: toSessionUser(user) };
  });
}
