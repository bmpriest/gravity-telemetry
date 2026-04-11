import { randomBytes, createHash } from "crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import type { Role, User } from "@prisma/client";
import prisma from "@/lib/prisma";

export const SESSION_COOKIE = "gt_session";
const SESSION_DAYS = 30;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/** Username validation — 3-32 chars, alphanumeric + `_`, `-`, `.`. */
export function isValidUsername(s: string): boolean {
  return /^[A-Za-z0-9._-]{3,32}$/.test(s);
}

/** Password validation — at least 8 chars, no other rules. */
export function isValidPassword(s: string): boolean {
  return typeof s === "string" && s.length >= 8 && s.length <= 200;
}

export interface CreateSessionOptions {
  userAgent?: string | null;
  ip?: string | null;
}

/** Creates a new session row, sets the cookie, and returns the plaintext token. */
export async function createSession(userId: string, opts: CreateSessionOptions = {}): Promise<string> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: { tokenHash, userId, expiresAt, userAgent: opts.userAgent ?? null, ip: opts.ip ?? null },
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return token;
}

export interface SessionUser {
  id: string;
  username: string;
  role: Role;
  mustChangePassword: boolean;
}

/** Reads the cookie, validates the session, returns the user or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  return toSessionUser(session.user);
}

export function toSessionUser(u: User): SessionUser {
  return { id: u.id, username: u.username, role: u.role, mustChangePassword: u.mustChangePassword };
}

/** Destroys the current session (if any) and clears the cookie. */
export async function destroyCurrentSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const tokenHash = hashToken(token);
    await prisma.session.deleteMany({ where: { tokenHash } });
  }
  jar.delete(SESSION_COOKIE);
}

/** Destroys every session for a user — used when an admin resets their password. */
export async function destroyAllSessionsForUser(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

// ---------------------------------------------------------------------------
// API helpers — throw to signal auth failure; routes catch and return JSON.
// ---------------------------------------------------------------------------

export class AuthError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError(401, "Not authenticated.");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new AuthError(403, "Admin access required.");
  return user;
}

/** Best-effort User-Agent + IP capture for the session row. */
export function describeRequest(req: NextRequest): CreateSessionOptions {
  return {
    userAgent: req.headers.get("user-agent"),
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  };
}
