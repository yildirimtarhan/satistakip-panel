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

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "1.8rem", fontWeight: "bold" }}>📊 Satış Takip Paneli</h1>

      {user ? (
        <p style={{ fontSize: "1.1rem", marginTop: "0.5rem" }}>
          Hoş geldin, <b>{user.email}</b> 👋
        </p>
      ) : (
        <p>Yükleniyor...</p>
      )}

      <div style={{ marginTop: "2rem", fontSize: "1rem", color: "#444" }}>
        ✅ Sol menüden işlemleri seçebilirsiniz.  
        <br />
        ✅ Hepsiburada API ayarlarınızı yaparak siparişleri çekebilirsiniz.
      </div>
    </div>
  );
}
