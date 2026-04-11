import type { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSession, describeRequest, destroyAllSessionsForUser, isValidPassword, requireUser, toSessionUser } from "@/lib/session";
import { handle } from "@/lib/api";

interface Body {
  oldPassword?: string;
  newPassword: string;
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const sessionUser = await requireUser();
    const body = (await req.json()) as Body;

    if (!isValidPassword(body.newPassword)) throw new Error("Password must be at least 8 characters.");

    const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
    if (!user) throw new Error("User not found.");

    // If the user is forced to change their password (admin reset), we don't
    // require them to know the old one — admins use this path to grant access
    // when a user has lost their credentials.
    if (!user.mustChangePassword) {
      if (!body.oldPassword || !(await verifyPassword(body.oldPassword, user.passwordHash))) {
        throw new Error("Current password is incorrect.");
      }
    }

    const newHash = await hashPassword(body.newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash, mustChangePassword: false },
    });

    // Rotate sessions: invalidate every existing session and mint a fresh one
    // for the current request. Protects against an attacker holding a session
    // alongside the legitimate user mid-reset.
    await destroyAllSessionsForUser(user.id);
    await createSession(user.id, describeRequest(req));

    const refreshed = await prisma.user.findUnique({ where: { id: user.id } });
    return { user: refreshed ? toSessionUser(refreshed) : null };
  });
}
