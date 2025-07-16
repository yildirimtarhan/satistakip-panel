// pages/panel/hepsiburada.js

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import jwt from "jsonwebtoken";

export default function HepsiburadaPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const decoded = jwt.decode(token);
      if (decoded?.email) {
        setUserEmail(decoded.email);
        setLoading(false);
      } else {
        router.push("/login");
      }
    } catch (err) {
      router.push("/login");
    }
  }, [router]);

  if (loading) return <p>Yükleniyor...</p>;

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>Hepsiburada Entegrasyonu</h1>
      <p>Hoş geldiniz, {userEmail}!</p>

      <h3>📦 Siparişleri Çek</h3>
      <button onClick={() => alert("Hepsiburada siparişleri çekiliyor...")}>
        Siparişleri Getir
      </button>

      <h3>📦 Ürünleri Güncelle</h3>
      <button onClick={() => alert("Ürün güncelleme işlemi başlatıldı...")}>
        Ürünleri Güncelle
      </button>

      <br /><br />
      <a href="/panel">← Geri Dön</a>
    </div>
  );
}
