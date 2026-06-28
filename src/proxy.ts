// src/proxy.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const publicRoutes = ["/login", "/register"];

const backofficeRoutes = [
  "/pilotage-administratif",
  "/employees",
  "/users",
  "/meetings",
  "/objectives",
  "/inventory",
  "/documents",
  "/profile"
];

const employeRoutes = [
  "/home",
  "/evenements",
  "/scan",
  "/tache",
  "/executant",
  "/mon-profil",
  "/rapports"
];

export async function proxy(req: NextRequest) {  // ← "middleware" → "proxy"
  const { nextUrl } = req;
  
  const token = await getToken({ 
    req, 
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    cookieName: "next-auth.session-token",
    secureCookie: process.env.NODE_ENV === "production"
  });

  const isLoggedIn = !!token;
  const role = token?.role as string | undefined;

  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");
  const isPublicRoute = publicRoutes.some(route => nextUrl.pathname === route);

  if (isApiAuthRoute) return NextResponse.next();

  if (isPublicRoute) {
    if (isLoggedIn) {
      if (role === "SUPER_ADMIN" || role === "ADMIN")
        return NextResponse.redirect(new URL("/pilotage-administratif", nextUrl));
      if (role === "SUPERVISEUR")
        return NextResponse.redirect(new URL("/superviseur", nextUrl));
      return NextResponse.redirect(new URL("/home", nextUrl));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    let callbackUrl = nextUrl.pathname;
    if (nextUrl.search) callbackUrl += nextUrl.search;
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`, nextUrl)
    );
  }

  const isBackofficeRoute = backofficeRoutes.some(route => nextUrl.pathname.startsWith(route));
  const isSuperviseurRoute = nextUrl.pathname.startsWith("/superviseur");
  const isEmployeRoute = employeRoutes.some(route => nextUrl.pathname.startsWith(route));

  if (isBackofficeRoute) {
    if (role !== "SUPER_ADMIN" && role !== "ADMIN") {
      if (role === "SUPERVISEUR")
        return NextResponse.redirect(new URL("/superviseur", nextUrl));
      return NextResponse.redirect(new URL("/home", nextUrl));
    }
  }

  if (isSuperviseurRoute) {
    if (role !== "SUPER_ADMIN" && role !== "SUPERVISEUR") {
      if (role === "ADMIN")
        return NextResponse.redirect(new URL("/pilotage-administratif", nextUrl));
      return NextResponse.redirect(new URL("/home", nextUrl));
    }
  }

  if (isEmployeRoute) {
    if (role !== "EXECUTANT" && role !== "SECRETAIRE") {
      if (role === "SUPER_ADMIN" || role === "ADMIN")
        return NextResponse.redirect(new URL("/pilotage-administratif", nextUrl));
      if (role === "SUPERVISEUR")
        return NextResponse.redirect(new URL("/superviseur", nextUrl));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|logo.webp|logo.svg).*)"],
};