"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import jwtDecode from "jwt-decode";

export default function RequireAuth({ children }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    // 🔥 TOKEN ARTIK COOKIE’DEN OKUNUYOR
    const token = Cookies.get("token");

    if (!token) {
      router.replace("/auth/login");
      return;
    }

    try {
      const decoded = jwtDecode(token);

      // Token süresi dolmuşsa
      if (decoded.exp * 1000 < Date.now()) {
        Cookies.remove("token");
        router.replace("/auth/login");
        return;
      }

      // Admin kontrolü
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
      Cookies.remove("token");
      router.replace("/auth/login");
    }
  }, [router]);

  if (!allowed) {
    return <div style={{ padding: 20 }}>Yükleniyor...</div>;
  }

  return children;
}
