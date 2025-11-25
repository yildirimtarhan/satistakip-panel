// 📁 /pages/dashboard/n11/products-sync.js
"use client";
import { useState } from "react";

export default function ProductsSync() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const syncProducts = async () => {
    setLoading(true);
    setResult(null);

    const token = localStorage.getItem("token");

    try {
      const res = await fetch("/api/n11/products/sync", {
        method: "GET", // ✅ DÜZELTİLDİ — API sadece GET kabul eder
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      setResult(data);
    } catch (err) {
      setResult({
        success: false,
        message: "Sync sırasında hata oluştu",
        error: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-orange-600 mb-4">
        🔄 Ürün Senkronizasyonu
      </h1>

      <button
        onClick={syncProducts}
        disabled={loading}
        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
      >
        {loading ? "Senkronize ediliyor..." : "N11 → ERP Ürünleri Senkronize Et"}
      </button>

      {result && (
        <div className="mt-4 p-4 bg-white rounded-xl shadow">
          <h2 className="font-bold mb-2">Sonuç:</h2>
          <pre className="text-sm whitespace-pre-wrap break-all">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
