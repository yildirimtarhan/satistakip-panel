// 📄 /pages/dashboard/hepsiburada/catalog.js
"use client";
import { useState } from "react";

export default function HbCatalog() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const syncProducts = async () => {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/hepsiburada-api/catalog/sync", {
        method: "POST",
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ success: false, error: err.message });
    }

    setLoading(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-orange-600 mb-4">
        🛍️ Hepsiburada Katalog Entegrasyonu
      </h1>

      <button
        onClick={syncProducts}
        disabled={loading}
        className={`px-5 py-2 rounded-lg text-white ${
          loading ? "bg-gray-400" : "bg-orange-600 hover:bg-orange-700"
        }`}
      >
        {loading ? "Gönderiliyor..." : "📦 Ürünleri Hepsiburada'ya Gönder"}
      </button>

      {result && (
        <div className="mt-6 bg-white p-4 rounded-lg shadow text-sm">
          <h3 className="font-semibold mb-2">
            Sonuç: {result.count || 0} ürün işlendi
          </h3>
          <pre className="text-xs bg-gray-50 p-3 rounded max-h-96 overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
