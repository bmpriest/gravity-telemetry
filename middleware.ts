import { NextResponse, type NextRequest } from "next/server";

// Cookie-presence gate for admin areas. Middleware can't reach Prisma in the
// edge runtime, so the full role check happens inside the route handler via
// requireAdmin(). The point of this layer is to bounce obviously-unauthenticated
// browser navigations away from /admin without rendering a flash of the page.
const SESSION_COOKIE = "gt_session";

export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has(SESSION_COOKIE);
  if (hasSession) return NextResponse.next();

  const { pathname } = req.nextUrl;

  // API requests get a JSON 401 so callers don't have to follow a redirect.
  if (pathname.startsWith("/api/admin")) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  // Page requests bounce to /login with a returnTo so we can come back after
  // sign-in.
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("returnTo", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
