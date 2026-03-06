// pages/dashboard/admin.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { jwtDecode } from "jwt-decode"; // ✅ Doğru import

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.push("/auth/login");
      return;
    }

    try {
      const decoded = jwtDecode(token);
      setUser(decoded);
    } catch (err) {
      console.error("Token çözümleme hatası:", err);
      localStorage.removeItem("token");
      router.push("/auth/login");
    }
  }, [router]);

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>👑 Yönetici Paneli</h1>

      {user ? (
        <p>
          Hoş geldin <b>{user.email}</b>
        </p>
      ) : (
        <p>Yükleniyor...</p>
      )}

      <div style={{ marginTop: "2rem", display: "flex", flexWrap: "wrap", gap: "1rem" }}>
        <button onClick={() => router.push("/dashboard/orders")}>
          📦 Siparişler
        </button>
        <button onClick={() => router.push("/dashboard/api-settings")}>
          ⚙️ API Ayarları
        </button>
        <button
          style={{ background: "#dc2626", color: "#fff" }}
          disabled={resetLoading}
          onClick={async () => {
            if (!confirm("Alış, satış ve cari hareketlerini tamamen silip carileri sıfırlayacaksınız. Emin misiniz?")) return;
            setResetLoading(true);
            setResetResult(null);
            try {
              const r = await fetch("/api/admin/reset-test-data", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
              });
              const data = await r.json();
              if (!r.ok) throw new Error(data.message || "İşlem başarısız");
              setResetResult(data);
              alert("✅ " + (data.message || "Sıfırlama tamamlandı."));
            } catch (e) {
              setResetResult({ error: e.message });
              alert("❌ " + e.message);
            } finally {
              setResetLoading(false);
            }
          }}
        >
          {resetLoading ? "⏳ Sıfırlanıyor..." : "🗑️ Test Verilerini Sıfırla"}
        </button>
        <button
          onClick={() => {
            localStorage.removeItem("token");
            router.push("/auth/login");
          }}
        >
          🚪 Çıkış Yap
        </button>
      </div>
      {resetResult && !resetResult.error && (
        <pre style={{ marginTop: "1rem", padding: "1rem", background: "#f3f4f6", borderRadius: 8, fontSize: 12 }}>
          {JSON.stringify(resetResult, null, 2)}
        </pre>
      )}
    </div>
  );
}
