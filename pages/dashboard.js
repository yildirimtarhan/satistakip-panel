// pages/dashboard.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import jwtDecode from "jwt-decode";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);
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
      console.error("Token hatalı:", err);
      localStorage.removeItem("token");
      router.push("/auth/login");
    }
  }, [router]);

  const handleTestHepsiburada = async () => {
    setLoading(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/hepsiburada-api/orders");
      const data = await res.json();

      if (!res.ok) {
        setTestResult(`❌ Hata: ${data.message || "Bilinmeyen hata"}`);
      } else if (Array.isArray(data) && data.length === 0) {
        setTestResult("✅ API bağlantısı başarılı ama sipariş bulunamadı.");
      } else {
        setTestResult("✅ API bağlantısı başarılı. Konsolu kontrol et 👇");
        console.log("Hepsiburada API Verisi:", data);
      }
    } catch (err) {
      setTestResult(`❌ İstek başarısız: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>📊 Satış Takip Kontrol Paneli</h1>
      {user ? (
        <p>Hoş geldin, <b>{user.email}</b></p>
      ) : (
        <p>Yükleniyor...</p>
      )}

      <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <button onClick={() => router.push("/dashboard/orders")}>📦 Siparişlerim</button>
        <button onClick={() => router.push("/dashboard/api-settings")}>⚙️ API Ayarları</button>
        <button onClick={handleTestHepsiburada} disabled={loading}>
          🧪 Hepsiburada API Test Et
        </button>
      </div>

      {loading && <p>⏳ Test ediliyor...</p>}
      {testResult && <p style={{ marginTop: "1rem" }}>{testResult}</p>}
    </div>
  );
}
