import { NextResponse } from "next/server";

export function middleware(req) {
  const token = req.cookies.get("token")?.value;
  const { pathname } = req.nextUrl;

  // ✅ Public sayfalar (herkese açık)
  const publicPaths = ["/auth/login", "/auth/register", "/auth/forgot-password"];
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    // Token varsa login sayfasını gösterme → dashboard'a yönlendir
    if (token) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // ✅ Dashboard koruması
  if (pathname.startsWith("/dashboard")) {
    if (!token) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }
  }

  return NextResponse.next();
}
console.log("MIDDLEWARE TOKEN:", token);
console.log("PATH:", pathname);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/auth/:path*"
  ]
};
