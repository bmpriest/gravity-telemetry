/**
 * /admin — server-side admin gate. Middleware already bounces unauthenticated
 * traffic to /login on cookie absence, but the role check has to happen here
 * (or inside the API routes) because the middleware edge runtime can't reach
 * Prisma. Logged-in non-admins get a 404-style "not found" page rather than a
 * 403 — we deliberately don't tell them the page exists.
 */

import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import AdminClient from "./AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") notFound();
  return <AdminClient currentUserId={user.id} />;
}
