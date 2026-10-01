import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";
import { buildCsp, createNonce } from "@/lib/csp";

const { auth } = NextAuth(authConfig);

const PROTECTED_PREFIXES = ["/library", "/documents", "/flashcards", "/quiz"];
const AUTH_PAGES = ["/login", "/register"];

function matches(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export const proxy = auth((request) => {
  const { pathname, search } = request.nextUrl;
  const isLoggedIn = Boolean(request.auth?.user);

  // Optimistic check only; pages and actions verify again via requireUser().
  if (!isLoggedIn && matches(pathname, PROTECTED_PREFIXES)) {
    const url = new URL("/login", request.nextUrl);
    url.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }
  if (isLoggedIn && matches(pathname, AUTH_PAGES)) {
    return NextResponse.redirect(new URL("/library", request.nextUrl));
  }

  const nonce = createNonce();
  const csp = buildCsp(nonce, process.env.NODE_ENV === "development");

  // Next.js reads the nonce from the request CSP header and applies it to its scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
});

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
