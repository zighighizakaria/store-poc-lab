import NextAuth from "next-auth";
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { authConfig } from "./lib/auth.config";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);
const { auth } = NextAuth(authConfig);

// First line of defence for /admin (server actions and route handlers check
// the session again with requireAdmin()). /admin stays outside locale routing.
const adminGuard = auth((request) => {
  const { pathname, search, origin } = request.nextUrl;
  const isLogin = pathname === "/admin/login";

  if (!request.auth && !isLogin) {
    // Server actions and other writes cannot follow a redirect to a page.
    if (request.method !== "GET" && request.method !== "HEAD") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const login = new URL("/admin/login", origin);
    if (pathname !== "/admin") login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }
  if (request.auth && isLogin && request.method === "GET") {
    return NextResponse.redirect(new URL("/admin", origin));
  }
  return NextResponse.next();
});

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  // auth() is typed for route handlers (it wants { params }); as middleware it receives the fetch event.
  if (request.nextUrl.pathname.startsWith("/admin")) return adminGuard(request, event as never);
  return intl(request);
}

export const config = {
  matcher: [
    "/admin/:path*",
    // Locale routing: skip /admin (handled above), /api, /media, Next
    // internals and any path with a file extension.
    "/((?!(?:api|admin|media)(?:/|$)|_next|_vercel|.*\..*).*)",
  ],
};
