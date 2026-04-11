/**
 * POST /api/admin/users/:id/reset-password — reset a user's password.
 *
 * Body:
 *   { password?: string }    // optional admin-chosen password; otherwise random
 *
 * Behavior:
 *   1. Hashes the new password and writes it.
 *   2. Sets mustChangePassword=true so the user is forced through the change
 *      gate on their next login (the password we hand out here is single-use).
 *   3. Destroys every existing session for that user. This is the security
 *      bedrock of admin reset — if an attacker is mid-session, the reset boots
 *      them immediately rather than letting them survive on a stale cookie.
 *
 * Response includes the plaintext password exactly once. The admin UI displays
 * it and never persists it — this is the only chance to copy it.
 */

import type { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { handle } from "@/lib/api";
import { hashPassword } from "@/lib/password";
import { destroyAllSessionsForUser, isValidPassword, requireAdmin } from "@/lib/session";
import { getRandomCharacters } from "@/utils/functions";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await requireAdmin();
    const { id } = await params;

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) throw new Error("User not found.");

    const body = (await req.json().catch(() => ({}))) as { password?: string };

    let password = body.password;
    if (password) {
      if (!isValidPassword(password)) throw new Error("Password must be at least 8 characters.");
    } else {
      // Random alphanum reset; long enough to be unguessable but still typeable.
      password = getRandomCharacters(16, "alphanumeric");
    }

    const passwordHash = await hashPassword(password);
    await prisma.user.update({
      where: { id },
      data: { passwordHash, mustChangePassword: true },
    });
    await destroyAllSessionsForUser(id);

    return { password };
  });
}
