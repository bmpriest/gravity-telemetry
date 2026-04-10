import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { withErrorHandler } from "@/lib/httpError";

export const GET = withErrorHandler(async () => {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: true, user: null });
  }
  return NextResponse.json({ success: true, user });
});
