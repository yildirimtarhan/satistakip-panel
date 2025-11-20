"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import jwt_decode from "jwt-decode";

export default function RequireAuth({ children }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token"); // ✔ Cookie değil LOCALSTORAGE

    if (!token) {
      router.replace("/auth/login");
      return;
    }

    try {
      const decoded = jwt_decode(token);

      // Token süresi dolmuş mu?
      if (decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem("token");
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
      console.error("Token çözümleme hatası:", err);
      localStorage.removeItem("token");
      router.replace("/auth/login");
    }
  }, [router]);

  if (!allowed) return <div style={{ padding: 20 }}>Yükleniyor...</div>;

  return children;
}
