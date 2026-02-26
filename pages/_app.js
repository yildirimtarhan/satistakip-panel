// 📁 /pages/_app.js
import "@/styles/globals.css";
import { useEffect } from "react";
import { useRouter } from "next/router";
import DashboardLayout from "@/components/layout/DashboardLayout";
import RequireAuth from "@/components/RequireAuth";
import Cookies from "js-cookie";
import { CompanyProvider } from "@/context/CompanyContext";
import { ToastProvider } from "@/hooks/useToast"; // ✅ EKLENDİ

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const isDashboard = router.pathname.startsWith("/dashboard");

  async function refreshTokenIfNeeded() {
    const token = Cookies.get("token");
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const exp = payload.exp * 1000;
      const now = Date.now();

      if (exp - now < 24 * 60 * 60 * 1000) {
        const res = await fetch("/api/auth/refresh", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (data?.token) {
          Cookies.set("token", data.token, {
            expires: 7,
            secure: true,
            sameSite: "lax",
            path: "/",
          });
          console.log("🔄 Cookie token yenilendi");
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

  if (isDashboard) {
    return (
      <RequireAuth cookieMode={true}>
        <CompanyProvider>
          <ToastProvider> {/* ✅ EKLENDİ */}
            <DashboardLayout>
              <Component {...pageProps} />
            </DashboardLayout>
          </ToastProvider> {/* ✅ EKLENDİ */}
        </CompanyProvider>
      </RequireAuth>
    );
  }

  // ✅ DÜZELTİLDİ: Parantez hatası giderildi
  return (
    <ToastProvider>
      <Component {...pageProps} />
    </ToastProvider>
  );
}