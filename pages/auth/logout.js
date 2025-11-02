// disable edge runtime for this page
export const runtime = "nodejs";
"use client";
import { useEffect } from "react";
import { useRouter } from "next/router";

// disable edge runtime for this page
export const runtime = "nodejs";

export default function Logout() {
  const router = useRouter();

  useEffect(() => {
    const logout = async () => {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } catch (e) {}
      
      // Token temizle
      localStorage.removeItem("token");
      document.cookie = "token=; Max-Age=0; path=/;";

      router.push("/auth/login");
    };

    logout();
  }, [router]);

  return <p style={{ padding: 20 }}>Çıkış yapılıyor...</p>;
}
