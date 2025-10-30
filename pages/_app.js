// 📁 /pages/_app.js
import "@/styles/globals.css";
import { useEffect } from "react";
import { useRouter } from "next/router";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const isDashboard = router.pathname.startsWith("/dashboard");

  // 🔁 Token yenileme fonksiyonu
  async function refreshTokenIfNeeded() {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const exp = payload.exp * 1000;
      const now = Date.now();

      // Token bitimine 1 günden az kaldıysa yenile
      if (exp - now < 24 * 60 * 60 * 1000) {
        const res = await fetch("/api/auth/refresh", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (data?.token) {
          localStorage.setItem("token", data.token);
          console.log("🔄 Token global olarak yenilendi ✅");
        }
      }
    } catch (err) {
      console.warn("Token yenileme hatası:", err);
    }
  }

  // 🔸 Sayfa açıldığında ve her 12 saatte bir kontrol et
  useEffect(() => {
    refreshTokenIfNeeded();

    const interval = setInterval(refreshTokenIfNeeded, 12 * 60 * 60 * 1000); // 12 saatte bir
    return () => clearInterval(interval);
  }, []);

  // ✅ Dashboard sayfaları için layout sarmalaması
  if (isDashboard) {
    return (
      <DashboardLayout>
        <Component {...pageProps} />
      </DashboardLayout>
    );
  }

  // ✅ Diğer sayfalar (login/register/public)
  return <Component {...pageProps} />;
}
