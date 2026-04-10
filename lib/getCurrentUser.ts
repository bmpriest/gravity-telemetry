import { readSessionCookie } from "@/lib/session";
import { verifySession, type SessionUser } from "@/lib/auth";

/** Server-component-friendly current user reader. Returns null when not logged in. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = await readSessionCookie();
  if (!token) return null;
  return verifySession(token);
}
