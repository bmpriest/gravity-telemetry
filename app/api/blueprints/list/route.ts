import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withErrorHandler } from "@/lib/httpError";
import { listAccounts } from "@/lib/blueprints";

export const GET = withErrorHandler(async () => {
  const sessionUser = await requireUser();
  const accounts = await listAccounts(sessionUser.id);
  return NextResponse.json({ success: true, accounts });
});
