// /pages/logout.js
import { useEffect } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/router";

export default function Logout() {
  const router = useRouter();

  useEffect(() => {
    // ✅ Backend logout endpoint çağrısı (varsa)
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});

    // ✅ Tarayıcıdan token sil
    Cookies.remove("token");
    localStorage.removeItem("token");

    // ✅ Login sayfasına gönder
    router.push("/auth/login");
  }, [router]);

  return (
    <div style={{ padding: "2rem", textAlign: "center", fontFamily: "sans-serif" }}>
      🚪 Çıkış yapılıyor...
    </div>
  );
}
