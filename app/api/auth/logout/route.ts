import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";
import { withErrorHandler } from "@/lib/httpError";

export const POST = withErrorHandler(async () => {
  await destroySession();
  return NextResponse.json({ success: true });
});
