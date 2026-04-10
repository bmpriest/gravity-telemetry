import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import prisma from "@/lib/prisma";
import { HttpError } from "@/lib/httpError";
import {
  SESSION_TTL_SECONDS,
  SESSION_RENEW_THRESHOLD_MS,
  setSessionCookie,
  clearSessionCookie,
  readSessionCookie,
} from "@/lib/session";

const BCRYPT_COST = 12;

export type SessionUser = {
  id: string;
  username: string;
  isAdmin: boolean;
  mustChangePassword: boolean;
};

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, BCRYPT_COST);
}

export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await prisma.session.create({ data: { token, userId, expiresAt } });
  await setSessionCookie(token);
  return token;
}

export async function destroySession(): Promise<void> {
  const token = await readSessionCookie();
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }
  await clearSessionCookie();
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    // Expired — best-effort cleanup, ignore failures.
    void prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  // Sliding renewal: if <7 days remain, extend to full TTL.
  const remaining = session.expiresAt.getTime() - Date.now();
  if (remaining < SESSION_RENEW_THRESHOLD_MS) {
    const newExpiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
    await prisma.session.update({
      where: { id: session.id },
      data: { expiresAt: newExpiresAt },
    });
    await setSessionCookie(token);
  }

  return {
    id: session.user.id,
    username: session.user.username,
    isAdmin: session.user.isAdmin,
    mustChangePassword: session.user.mustChangePassword,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const token = await readSessionCookie();
  if (!token) throw new HttpError(401, "Not authenticated");
  const user = await verifySession(token);
  if (!user) throw new HttpError(401, "Session expired");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.isAdmin) throw new HttpError(403, "Admin only");
  return user;
}
