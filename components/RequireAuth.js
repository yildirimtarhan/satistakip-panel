"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { jwtDecode } from "jwt-decode";   // ✅ ARTIK named import
import Cookies from "js-cookie";

export default function RequireAuth({ children, cookieMode = false }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let token = null;

    // 🔐 Önce cookie’den dene (cookieMode true ise)
    if (cookieMode) {
      token = Cookies.get("token") || null;
    }

    // 🔐 Cookie yoksa localStorage’a bak (eski çalışma şeklimiz)
    if (!token && typeof window !== "undefined") {
      token = localStorage.getItem("token");
    }

    // Hiç token yoksa login’e
    if (!token) {
      router.replace("/auth/login");
      return;
    }

    try {
      const decoded = jwtDecode(token);

      // ⏱ Süresi geçmişse
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("token");
        }
        Cookies.remove("token");
        router.replace("/auth/login");
        return;
      }

      // 🔒 Admin sayfalarına sadece admin rolü
      if (router.pathname.startsWith("/dashboard/admin")) {
        if (decoded.role !== "admin") {
          alert("Bu sayfaya erişim yetkiniz yok ❌");
          router.replace("/dashboard");
          return;
        }
      }

      setAllowed(true);
    } catch (err) {
      console.error("Token hatası:", err);
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
      }
      Cookies.remove("token");
      router.replace("/auth/login");
    }
  }, [router, cookieMode]);

  if (!allowed) {
    return <div style={{ padding: 20 }}>Yükleniyor...</div>;
  }

  return children;
}
