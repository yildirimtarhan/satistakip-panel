import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import jwt from "jsonwebtoken";
import Link from "next/link"; // 🔥 Eksik olan bu, eklendi

export default function PanelPage() {
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
      console.error("Token geçersiz:", err);
      router.push("/login");
    }
  }, [router]);

  const handleLogout = () => {
    Cookies.remove("token");
    router.push("/login");
  };

  if (loading) return <p>Yükleniyor...</p>;

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>🔐 Admin Paneli</h1>
      <p>👋 Hoş geldiniz, <strong>{userEmail}</strong></p>

      <hr />
      <h2>📊 Yönetim Seçenekleri</h2>
      <ul>
        <li><button>🧾 E-Fatura Listesi</button></li>
        <li>
          <Link href="/amazon">
            <button>📦 Amazon Siparişleri</button>
          </Link>
        </li>
        <li>
          <Link href="/n11">
            <button>🛍️ N11 Siparişleri</button>
          </Link>
        </li>
        <li>
          <Link href="/hepsiburada">
            <button>🛒 Hepsiburada Siparişleri</button>
          </Link>
        </li>
        <li>
          <Link href="/trendyol">
            <button>🧺 Trendyol Siparişleri</button>
          </Link>
        </li>
        <li><button>🍽️ Yemeksepeti Entegrasyonu</button></li>
        <li><button>🛒 Migros / Getir Siparişleri</button></li>
      </ul>

      <hr />
      <button onClick={handleLogout}>🚪 Çıkış Yap</button>
    </div>
  );
}
