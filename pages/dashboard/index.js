// pages/dashboard/index.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { jwtDecode } from "jwt-decode";

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
      const decoded = jwtDecode(token);
      setUser(decoded);
    } catch (err) {
      console.error("Token hatalı:", err);
      localStorage.removeItem("token");
      router.push("/auth/login");
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/auth/login");
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>📊 Satış Takip Paneli</h1>

      {user ? (
        <p>Hoş geldin, <b>{user.email}</b> 👋</p>
      ) : (
        <p>Yükleniyor...</p>
      )}

      <p style={{ color: "#666", marginTop: "1rem" }}>
        Sol menüden işlem seçebilirsiniz.
      </p>

      <button
        onClick={handleLogout}
        style={{
          marginTop: "2rem",
          padding: "10px",
          background: "#ef4444",
          color: "#fff",
          borderRadius: "6px",
          border: "none",
          cursor: "pointer",
        }}
      >
        🚪 Çıkış Yap
      </button>
    </div>
  );
}
