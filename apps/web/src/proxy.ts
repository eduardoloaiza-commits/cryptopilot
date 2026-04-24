import { NextResponse, type NextRequest } from "next/server";

const REALM = "CryptoPilot";

export function proxy(req: NextRequest) {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) return NextResponse.next();

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    const [user, pass] = atob(auth.slice(6)).split(":");
    if (pass === password && (user ?? "") !== "") return NextResponse.next();
  }

  return new NextResponse("Auth required", {
    status: 401,
    headers: { "WWW-Authenticate": `Basic realm="${REALM}"` },
  });
}

export const config = {
  matcher: [
    // Protege todas las rutas excepto los estáticos de Next y el favicon
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
