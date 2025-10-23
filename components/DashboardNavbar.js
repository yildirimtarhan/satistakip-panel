// 📁 /components/DashboardNavbar.js
import { useRouter } from "next/router";

export default function DashboardNavbar({ onLogout }) {
  const router = useRouter();

  return (
    <nav
      style={{
        backgroundColor: "#f8fafc",
        padding: "10px 20px",
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          fontWeight: "bold",
          fontSize: "1.2rem",
          color: "#111827",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <span>📊 Satış Takip Paneli</span>
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <button
          onClick={() => router.push("/dashboard/orders")}
          style={btnStyle("#3b82f6")}
        >
          📦 Siparişlerim
        </button>

        <button
          onClick={() => router.push("/dashboard/settings")}
          style={btnStyle("#10b981")}
        >
          ⚙️ API Ayarları
        </button>

        <button
          onClick={() => router.push("/dashboard/cari")}
          style={btnStyle("#facc15", "#222")}
        >
          💰 Cari Paneli
        </button>

        <button onClick={onLogout} style={btnStyle("#ef4444")}>
          🚪 Çıkış Yap
        </button>
      </div>
    </nav>
  );
}

function btnStyle(bgColor, textColor = "white") {
  return {
    backgroundColor: bgColor,
    color: textColor,
    border: "none",
    padding: "8px 14px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "500",
  };
}
