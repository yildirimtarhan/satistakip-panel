import { NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";

export function middleware(req) {
  const token = req.cookies.get("token")?.value;
  const url = req.nextUrl.pathname;

  // ✅ Sadece /dashboard yollarını koru
  const protectedPaths = [
    "/dashboard",
    "/dashboard/",
    "/dashboard/api-settings",
    "/dashboard/hepsiburada",
    "/dashboard/hepsiburada/orders",
    "/dashboard/cari",
    "/dashboard/urunler",
    "/dashboard/urun-satis",
    "/dashboard/urun-alis",
    "/dashboard/cari-tahsilat",
    "/dashboard/stok-raporu",
    "/dashboard/stok-hareketleri",
    "/dashboard/teklifler",
    "/dashboard/raporlar",
    "/dashboard/ayarlar",
  ];

  if (protectedPaths.some((path) => url.startsWith(path))) {
    if (!token) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }

    try {
      jwtDecode(token);
    } catch (err) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/"],
};
