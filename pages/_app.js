// 📁 /pages/_app.js
import "@/styles/globals.css";
import { useEffect } from "react";
import { useRouter } from "next/router";
import DashboardLayout from "@/components/layout/DashboardLayout";
import RequireAuth from "@/components/RequireAuth";

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const isDashboard = router.pathname.startsWith("/dashboard");

  // 🔁 Token yenileme fonksiyonu
  async function refreshTokenIfNeeded() {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const exp = payload.exp * 1000;
      const now = Date.now();

      if (exp - now < 24 * 60 * 60 * 1000) {
        const res = await fetch("/api/auth/refresh", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (data?.token) {
          localStorage.setItem("token", data.token);
          console.log("🔄 Token yenilendi ✅");
        }
      }
    } catch (err) {
      console.warn("Token yenileme hatası:", err);
    }
  }

  useEffect(() => {
    refreshTokenIfNeeded();
    const interval = setInterval(refreshTokenIfNeeded, 12 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // ✅ Dashboard korumalı
  if (isDashboard) {
    return (
      <RequireAuth>
        <DashboardLayout>
          <Component {...pageProps} />
        </DashboardLayout>
      </RequireAuth>
    );
  }

  // ✅ Login / Register / Public sayfalar
  return <Component {...pageProps} />;
}
