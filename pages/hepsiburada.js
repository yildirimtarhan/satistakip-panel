// pages/panel/hepsiburada.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link"; // Link importu en üste taşındı
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

  if (loading) return <div className="loading-spinner">Yükleniyor...</div>;

  return (
    <div className="integration-panel">
      <h1 className="panel-title">Hepsiburada Entegrasyonu</h1>
      <p className="welcome-message">
        Hoş geldiniz, <span>{userEmail.replace(/[&<>'"]/g, "")}</span>!
      </p>

      <div className="action-section">
        <h3>📦 Siparişleri Çek</h3>
        <button 
          className="action-button"
          onClick={() => handleFetchOrders()}
          disabled={loading}
        >
          {loading ? "İşleniyor..." : "Siparişleri Getir"}
        </button>
      </div>

      <div className="action-section">
        <h3>📦 Ürünleri Güncelle</h3>
        <button 
          className="action-button"
          onClick={() => handleUpdateProducts()}
          disabled={loading}
        >
          {loading ? "İşleniyor..." : "Ürünleri Güncelle"}
        </button>
      </div>

      <div className="navigation">
        <Link href="/panel" passHref legacyBehavior>
          <a className="back-link">← Panel Ana Sayfasına Dön</a>
        </Link>
      </div>

      <style jsx>{`
        .integration-panel {
          padding: 2rem;
          max-width: 800px;
          margin: 0 auto;
          font-family: 'Arial', sans-serif;
        }
        .panel-title {
          color: #2b6cb0;
          margin-bottom: 1.5rem;
        }
        .welcome-message {
          margin-bottom: 2rem;
          color: #4a5568;
        }
        .action-section {
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: #f7fafc;
          border-radius: 8px;
        }
        .action-button {
          padding: 0.75rem 1.5rem;
          background: #4299e1;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .action-button:hover {
          background: #3182ce;
        }
        .action-button:disabled {
          background: #a0aec0;
          cursor: not-allowed;
        }
        .back-link {
          color: #4299e1;
          text-decoration: none;
          display: inline-block;
          margin-top: 2rem;
        }
        .back-link:hover {
          text-decoration: underline;
        }
        .loading-spinner {
          text-align: center;
          padding: 2rem;
        }
      `}</style>
    </div>
  );

  async function handleFetchOrders() {
    setLoading(true);
    try {
      // Gerçek API çağrısı için örnek:
      // const response = await fetch('/api/hepsiburada/orders');
      alert("Hepsiburada siparişleri çekiliyor...");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateProducts() {
    setLoading(true);
    try {
      // Gerçek API çağrısı için örnek:
      // const response = await fetch('/api/hepsiburada/update-products');
      alert("Ürün güncelleme işlemi başlatıldı...");
    } finally {
      setLoading(false);
    }
  }
}