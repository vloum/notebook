import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware to handle auth redirects:
 * - Unauthenticated users accessing /dashboard/* → redirect to /login
 * - The landing page (/) is always accessible
 * - /login and /register are always accessible
 * - API routes handle their own auth
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths - always accessible
  if (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/logo")
  ) {
    return NextResponse.next();
  }

  // Check for auth session cookie (NextAuth)
  const authCookie =
    request.cookies.get("authjs.session-token") ||
    request.cookies.get("__Secure-authjs.session-token") ||
    request.cookies.get("next-auth.session-token") ||
    request.cookies.get("__Secure-next-auth.session-token");

  if (!authCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files
    "/((?!_next/static|_next/image|favicon.ico|logo.svg|.*\\.svg$|.*\\.png$).*)",
  ],
};
