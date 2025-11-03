import { NextResponse } from "next/server";

export function middleware(req) {
  const token = req.cookies.get("token")?.value;
  const { pathname } = req.nextUrl;

  console.log("✅ Middleware kontrol:", { pathname, token: token ? "VAR" : "YOK" });

  // ✅ Public sayfalar (giriş gerektirmez)
  const publicPaths = [
    "/auth/login",
    "/auth/register",
    "/auth/forgot-password",
    "/auth/reset-password",
    "/auth/logout" // logout sayfası public
  ];

  if (publicPaths.some((path) => pathname.startsWith(path))) {
    // Token varsa login/register ziyaretini engelle, dashboard'a at
    if (token && pathname.startsWith("/auth")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // ✅ Dashboard koruması
  if (pathname.startsWith("/dashboard")) {
    if (!token) {
      console.log("❌ Token yok → Login'e yönlendiriliyor");
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/auth/:path*"
  ]
};
