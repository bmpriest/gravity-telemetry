import "server-only";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

let bootstrapped = false;

export async function bootstrapAdmin(): Promise<void> {
  if (bootstrapped) return;
  bootstrapped = true;

  // Opportunistic session cleanup
  try {
    const swept = await prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (swept.count > 0) {
      console.log(`[bootstrap] swept ${String(swept.count)} expired sessions`);
    }
  } catch (err) {
    console.warn("[bootstrap] session sweep failed:", err);
  }

  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    console.warn(
      "[bootstrap] ADMIN_USERNAME / ADMIN_PASSWORD not set; skipping admin seed"
    );
    return;
  }

  try {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) return;

    const passwordHash = await hashPassword(password);
    await prisma.user.create({
      data: {
        username,
        passwordHash,
        isAdmin: true,
        mustChangePassword: true,
      },
    });
    console.log(
      `[bootstrap] created admin user "${username}" (mustChangePassword=true)`
    );
  } catch (err) {
    console.error("[bootstrap] admin seed failed:", err);
  }
}
