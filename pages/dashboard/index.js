// pages/dashboard/index.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { jwtDecode } from "jwt-decode";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // ✅ EKLENDİ

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const decoded = jwtDecode(token);
      const now = Date.now() / 1000;

      if (decoded.exp && decoded.exp > now) {
        setUser(decoded);
      } else {
        localStorage.removeItem("token");
      }
    } catch (err) {
      console.error("Token error:", err);
      localStorage.removeItem("token");
    }

    setLoading(false);
  }, []);

  // ✅ Token kontrolü tamamlanana kadar boş ekran göster
  if (loading) return <p style={{ padding: 20 }}>⏳ Kontrol ediliyor...</p>;

  // ✅ Token yok -> login ekranına gönder
  if (!user) {
    router.replace("/auth/login");
    return null;
  }

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>📊 Satış Takip Paneli</h1>
      <p>Hoş geldin, <b>{user.email}</b> 👋</p>
      <p>✅ Sol menüden işlem seçebilirsiniz</p>
    </div>
  );
}
