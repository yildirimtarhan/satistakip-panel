// pages/dashboard.js

import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.push("/auth/login"); // Giriş yoksa login'e yönlendir
    } else {
      // Token varsa decode etmeden sadece örnek kullanıcı verisi
      setUser({ email: "kullanici@example.com" });
    }
  }, []);

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>📊 Satış Takip Paneli</h1>
      {user ? (
        <p>Hoş geldin, {user.email}</p>
      ) : (
        <p>Yükleniyor...</p>
      )}
    </div>
  );
}
