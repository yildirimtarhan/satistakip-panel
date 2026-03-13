"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function TrendyolTestAllPage() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    setResult(null);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/trendyol/test-all", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setResult({ success: false, message: e.message, results: [] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-orange-600 mb-2">Trendyol API Test Merkezi</h1>
      <p className="text-slate-600 mb-6">
        Tüm Trendyol API modüllerini test edin. Canlıya geçmeden önce bağlantıları doğrulayın.
      </p>
      <div className="flex gap-3 mb-6">
        <button
          onClick={runTests}
          disabled={loading}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 font-medium"
        >
          {loading ? "Test ediliyor…" : "Tüm Testleri Çalıştır"}
        </button>
        <Link href="/dashboard/api-settings?tab=trendyol" className="px-4 py-2 bg-slate-100 rounded-lg hover:bg-slate-200">
          API Ayarları
        </Link>
        <Link href="/dashboard/trendyol/orders" className="text-orange-600 hover:underline py-2">
          Siparişlere Git
        </Link>
      </div>
      {result && (
        <div className={`rounded-xl border p-6 ${result.success ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
          <h2 className="font-semibold text-lg mb-2">
            {result.success ? "✅ Tüm testler başarılı" : "⚠️ Bazı testler başarısız"}
          </h2>
          <p className="text-sm text-slate-600 mb-4">{result.message}</p>
          {result.baseUrl && (
            <p className="text-xs text-slate-500 mb-4">Base: {result.baseUrl}</p>
          )}
          <div className="space-y-2">
            {(result.results || []).map((r, i) => (
              <div
                key={i}
                className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                  r.ok ? "bg-white/80" : "bg-red-50"
                }`}
              >
                <span className="font-medium">{r.name}</span>
                <span className={r.ok ? "text-green-600 text-sm" : "text-red-600 text-sm"}>
                  {r.ok ? "✓ OK" : `✗ ${r.status} ${r.error || (typeof r.data === "string" ? r.data.slice(0, 50) : "")}`}
                </span>
              </div>
            ))}
          </div>
          {!result.success && (
            <p className="text-sm text-amber-800 mt-4">
              Başarısız testler rol/yetki gerektirebilir. Trendyol Hesap Bilgilerim → Entegrasyon Bilgileri
              bölümünden ilgili rolleri aktif edin.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
