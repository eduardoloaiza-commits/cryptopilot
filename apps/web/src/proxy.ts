import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

const PUBLIC_PATHS = new Set([
  "/sign-in",
  "/setup",
  "/recover",
]);

const PUBLIC_API_PREFIXES = [
  "/api/auth/",
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  for (const p of PUBLIC_API_PREFIXES) if (pathname.startsWith(p)) return true;
  return false;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) return NextResponse.next();

  // Para endpoints API: 401 JSON
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Para páginas: redirect a /sign-in con next=...
  const url = req.nextUrl.clone();
  url.pathname = "/sign-in";
  url.search = `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
