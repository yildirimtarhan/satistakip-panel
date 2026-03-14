"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

function formatMoney(v) {
  return v != null ? `₺${Number(v).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : "—";
}

export default function PazaramaAccountingPage() {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const now = new Date();
  const defStart = new Date(now);
  defStart.setDate(defStart.getDate() - 30);
  const [startDate, setStartDate] = useState(defStart.toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(now.toISOString().slice(0, 10));

  const load = () => {
    const token = localStorage.getItem("token");
    setLoading(true);
    setError("");
    fetch(
      `/api/pazarama/accounting?startDate=${startDate}&endDate=${endDate}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: "include" }
    )
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setTransactions(d.transactions || []);
          setSummary(d.summary || {});
        } else setError(d.message || d.error || "Muhasebe kayıtları alınamadı.");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) load();
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-orange-600 mb-2">Pazarama Muhasebe & Finans</h1>
      <p className="text-slate-600 mb-6">Satış, iade ve komisyon işlemleri (Ödeme Anlaşması).</p>

      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        />
        <button
          onClick={load}
          disabled={loading}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 text-sm"
        >
          Sorgula
        </button>
        <Link href="/dashboard/pazarama/orders" className="text-orange-600 hover:underline text-sm">
          Siparişler
        </Link>
        <Link href="/dashboard/api-settings?tab=pazarama" className="text-orange-600 hover:underline text-sm">
          API Ayarları
        </Link>
      </div>

      {(summary.totalAmount != null || summary.totalCommission != null) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-xs text-gray-500">Toplam Tutar</div>
            <div className="text-xl font-bold text-green-600">{formatMoney(summary.totalAmount)}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-xs text-gray-500">Toplam Komisyon</div>
            <div className="text-xl font-bold text-red-600">{formatMoney(summary.totalCommission)}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-xs text-gray-500">Toplam Ödenen</div>
            <div className="text-xl font-bold text-blue-600">{formatMoney(summary.totalAllowance)}</div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Yükleniyor…</div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            Kayıt yok. Tarih aralığını değiştirip tekrar sorgulayın.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Tarih</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Kod</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Durum</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Tutar</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Komisyon</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Transfer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((t, i) => (
                  <tr key={t.trxId || t.orderId || i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm">
                      {t.transactionDate ? new Date(t.transactionDate).toLocaleDateString("tr-TR") : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm">{t.trxCode || t.orderId || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 text-xs rounded bg-slate-100 text-slate-700">
                        {t.status || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatMoney(t.amount)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatMoney(t.commissionAmount)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {t.transferredDate ? new Date(t.transferredDate).toLocaleDateString("tr-TR") : "—"}
                    </td>
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
