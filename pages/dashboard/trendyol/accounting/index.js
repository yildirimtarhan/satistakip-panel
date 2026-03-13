"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function TrendyolAccountingPage() {
  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [transactionType, setTransactionType] = useState("Sale");

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`/api/trendyol/accounting?transactionType=${transactionType}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setStatements(d.statements || []);
        else setError(d.message || "Cari ekstre alınamadı.");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [transactionType]);

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-orange-600 mb-2">Muhasebe & Finans</h1>
      <p className="text-slate-600 mb-6">Trendyol cari hesap ekstresi (son 30 gün).</p>
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <select
          value={transactionType}
          onChange={(e) => setTransactionType(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="Sale">Satış</option>
          <option value="Return">İade</option>
          <option value="Discount">İndirim</option>
          <option value="Coupon">Kupon</option>
        </select>
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
          <p className="text-sm mt-1">Muhasebe rolü API anahtarında aktif olmalı.</p>
        </div>
      )}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Yükleniyor…</div>
        ) : statements.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            Kayıt yok veya API ayarlarını kontrol edin.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Tarih</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Açıklama</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Sipariş No</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Alacak</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Borç</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {statements.map((s, i) => (
                  <tr key={s.id ?? i} className="hover:bg-slate-50">
                    <td className="px-4 py-3">{s.transactionDate ? new Date(s.transactionDate).toLocaleDateString("tr-TR") : "—"}</td>
                    <td className="px-4 py-3">{s.description ?? s.transactionType ?? "—"}</td>
                    <td className="px-4 py-3">{s.orderNumber ?? "—"}</td>
                    <td className="px-4 py-3 text-right">₺{(s.credit ?? 0).toLocaleString("tr-TR")}</td>
                    <td className="px-4 py-3 text-right text-red-600">₺{(s.debt ?? 0).toLocaleString("tr-TR")}</td>
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
