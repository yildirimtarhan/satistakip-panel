"use client";
import { useEffect } from "react";
import { useRouter } from "next/router";

export const runtime = "nodejs"; // ✅ SSR kapatma

export default function Logout() {
  const router = useRouter();

  useEffect(() => {
    async function doLogout() {
      try {
        // API çağır
        await fetch("/api/auth/logout", { method: "POST" });
      } catch (e) {}

      // Token temizle
      localStorage.removeItem("token");
      document.cookie = "token=; Max-Age=0; path=/;";

      router.push("/auth/login");
    }

    doLogout();
  }, [router]);

  return <p style={{ padding: 20 }}>Çıkış yapılıyor...</p>;
}
