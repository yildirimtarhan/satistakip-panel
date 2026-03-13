"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function TrendyolReturnsPage() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch("/api/trendyol/returns", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setReturns(d.returns || []);
        else setError(d.message || "İadeler yüklenemedi.");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-orange-600 mb-2">İade Entegrasyonu</h1>
      <p className="text-slate-600 mb-6">Trendyol iade taleplerini görüntüleyin.</p>
      <div className="flex gap-3 mb-6">
        <Link href="/dashboard/trendyol/orders" className="text-orange-600 hover:underline">
          Siparişler
        </Link>
        <Link href="/dashboard/api-settings?tab=trendyol" className="text-orange-600 hover:underline">
          API Ayarları
        </Link>
      </div>
      {error && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
          {error}
          <p className="text-sm mt-1">İade rolü API anahtarında aktif olmalı.</p>
        </div>
      )}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Yükleniyor…</div>
        ) : returns.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            İade kaydı yok veya API ayarlarını kontrol edin.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">ID / Sipariş</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Durum</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Tutar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {returns.map((r, i) => (
                  <tr key={r.id ?? i} className="hover:bg-slate-50">
                    <td className="px-4 py-3">{r.orderNumber ?? r.shipmentPackageId ?? r.id ?? "—"}</td>
                    <td className="px-4 py-3">{r.status ?? "—"}</td>
                    <td className="px-4 py-3 text-right">₺{r.amount?.toLocaleString?.("tr-TR") ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
