// 📁 pages/dashboard/e-donusum/efatura-kontor.js
// E-Fatura Kontör – Taxten panelden + kullanım + alım listesi
"use client";

import { useEffect, useState } from "react";

export default function EFaturaKontorPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchKontor = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/efatura/kontor", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const d = await res.json();
        setData(d);
      } else {
        setData({ error: "Veri alınamadı" });
      }
    } catch (err) {
      setData({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKontor();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold text-orange-600 mb-4">E-Fatura Kontör</h1>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  if (data?.error) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold text-orange-600 mb-4">E-Fatura Kontör</h1>
        <p className="text-red-600">{data.error}</p>
      </div>
    );
  }

  const { used, limit, loaded, remaining, hasLimit, fromTaxten, usageList = [], purchaseList = [] } = data || {};
  const limitDisplay = hasLimit ? (limit ?? loaded) : "Sınırsız";
  const remainingDisplay = hasLimit ? remaining : "—";
  const isLow = hasLimit && remaining != null && remaining <= 10 && remaining > 0;
  const isExhausted = hasLimit && remaining != null && remaining <= 0;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-orange-600">E-Fatura Kontör</h1>

      <div className="bg-white rounded-xl shadow p-6 max-w-3xl">
        {fromTaxten && (
          <p className="text-green-600 text-sm mb-3">✓ Kontör bilgisi Taxten panelden alındı.</p>
        )}
        {!fromTaxten && (
          <p className="text-slate-500 text-sm mb-3">
            Taxten API kontör endpoint&apos;i mevcut değilse yerel veriler gösterilir. Her belge (E-Fatura, E-Arşiv, E-İrsaliye — giden ve gelen) 1 kontör düşer.
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="border rounded-lg p-4 bg-slate-50">
            <p className="text-sm text-slate-500">Kullanılan</p>
            <p className="text-2xl font-bold text-slate-800">{used ?? 0}</p>
          </div>
          <div className="border rounded-lg p-4 bg-slate-50">
            <p className="text-sm text-slate-500">Yüklenen</p>
            <p className="text-2xl font-bold text-slate-800">{limitDisplay}</p>
          </div>
          <div className="border rounded-lg p-4 bg-slate-50">
            <p className="text-sm text-slate-500">Kalan</p>
            <p className="text-2xl font-bold text-slate-800">{remainingDisplay}</p>
          </div>
          <div
            className={`border rounded-lg p-4 ${
              isExhausted ? "bg-red-50" : isLow ? "bg-amber-50" : "bg-slate-50"
            }`}
          >
            <p className="text-sm text-slate-500">Durum</p>
            <p
              className={`text-lg font-bold ${
                isExhausted ? "text-red-600" : isLow ? "text-amber-600" : "text-green-600"
              }`}
            >
              {isExhausted ? "Tükenmiş" : isLow ? "Az" : "Yeterli"}
            </p>
          </div>
        </div>
        {isExhausted && (
          <p className="mt-4 text-red-600 text-sm">
            Kontörünüz tükenmiştir. Taxten panelinden yükleme yapın veya aşağıdan alım kaydı ekleyin.
          </p>
        )}
      </div>

      {/* Kullanım listesi */}
      <div className="bg-white rounded-xl shadow p-6 max-w-3xl">
        <h2 className="font-semibold text-slate-800 mb-3">Kullanım Listesi</h2>
        <p className="text-slate-500 text-sm mb-4">
          Giden ve gelen tüm belgeler (E-Fatura, E-Arşiv, E-İrsaliye) — her biri 1 kontör düşer
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left py-2 px-3">Belge No</th>
                <th className="text-left py-2 px-3">Tarih</th>
                <th className="text-left py-2 px-3">Tür</th>
                <th className="text-left py-2 px-3">Yön</th>
              </tr>
            </thead>
            <tbody>
              {usageList.length === 0 ? (
                <tr><td colSpan={4} className="py-4 text-slate-500 text-center">Henüz kullanım kaydı yok.</td></tr>
              ) : (
                usageList.map((u, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-2 px-3">{u.invoiceNumber || u.invoiceNo || "-"}</td>
                    <td className="py-2 px-3">
                      {(u.sentAt || u.receivedAt) ? new Date(u.sentAt || u.receivedAt).toLocaleString("tr-TR") : "-"}
                    </td>
                    <td className="py-2 px-3">{u.type || (u.isEarsiv ? "E-Arşiv" : "E-Fatura")}</td>
                    <td className="py-2 px-3">
                      <span className={u.direction === "gelen" ? "text-blue-600" : "text-green-600"}>
                        {u.direction === "gelen" ? "Gelen" : "Giden"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alım listesi – sadece admin ekler */}
      <div className="bg-white rounded-xl shadow p-6 max-w-3xl">
        <h2 className="font-semibold text-slate-800 mb-3">Alım Listesi</h2>
        <p className="text-slate-500 text-sm mb-4">Kontör alımları sadece admin panelinden eklenir.</p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left py-2 px-3">Tarih</th>
                <th className="text-right py-2 px-3">Miktar</th>
                <th className="text-left py-2 px-3">Kaynak</th>
                <th className="text-left py-2 px-3">Not</th>
              </tr>
            </thead>
            <tbody>
              {purchaseList.length === 0 ? (
                <tr><td colSpan={4} className="py-4 text-slate-500 text-center">Henüz alım kaydı yok.</td></tr>
              ) : (
                purchaseList.map((p, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-2 px-3">
                      {p.purchasedAt ? new Date(p.purchasedAt).toLocaleString("tr-TR") : "-"}
                    </td>
                    <td className="py-2 px-3 text-right font-medium">+{p.amount}</td>
                    <td className="py-2 px-3">{p.source === "taxten_panel" ? "Taxten Panel" : "Manuel"}</td>
                    <td className="py-2 px-3 text-slate-600">{p.note || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-50 rounded-lg p-4 max-w-3xl">
        <h2 className="font-semibold text-slate-700 mb-2">ERP Entegrasyonu</h2>
        <p className="text-sm text-slate-600 mb-2">
          <code className="bg-white px-1 rounded">GET /api/efatura/kontor</code> + Bearer token ile kontör bilgisi, kullanım ve alım listelerini alabilirsiniz.
        </p>
      </div>
    </div>
  );
}
