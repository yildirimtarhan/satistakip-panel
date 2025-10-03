// pages/dashboard.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { jwtDecode } from "jwt-decode"; // ✅ Düzeltildi

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    try {
      const decoded = jwtDecode(token); // ✅ Burada artık doğru import kullanılıyor
      setUser(decoded);
    } catch (err) {
      console.error("Token hatalı:", err);
      localStorage.removeItem("token");
      router.push("/auth/login");
    }
  }, [router]);

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>📊 Satış Takip Kontrol Paneli</h1>
      {user ? (
        <p>Hoş geldin, <b>{user.email}</b></p>
      ) : (
        <p>Yükleniyor...</p>
      )}

      <div style={{ marginTop: "2rem" }}>
        <button onClick={() => router.push("/dashboard/orders")}>
          📦 Siparişlerim
        </button>
        <button onClick={() => router.push("/dashboard/api-settings")}>
          ⚙️ API Ayarları
        </button>
      </div>
    </div>
  );
}
