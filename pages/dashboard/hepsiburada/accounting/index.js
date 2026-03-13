"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function HepsiburadaAccountingPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [transactionType, setTransactionType] = useState("");
  const now = new Date();
  const defStart = new Date(now);
  defStart.setDate(defStart.getDate() - 30);
  const [dateStart, setDateStart] = useState(defStart.toISOString().slice(0, 10));
  const [dateEnd, setDateEnd] = useState(now.toISOString().slice(0, 10));

  const load = () => {
    const token = localStorage.getItem("token");
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (transactionType) params.set("transactionTypes", transactionType);
    if (dateStart) params.set("paymentDateStart", dateStart);
    if (dateEnd) params.set("paymentDateEnd", dateEnd);
    params.set("limit", "100");

    fetch(`/api/hepsiburada/accounting?${params.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setTransactions(d.transactions || []);
        else setError(d.message || "Muhasebe kayıtları alınamadı.");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [status, transactionType]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatMoney = (v) => (v != null ? `₺${Number(v).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : "—");

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-2xl font-bold text-orange-600 mb-2">Hepsiburada Muhasebe & Finans</h1>
      <p className="text-slate-600 mb-6">Ödeme, komisyon ve fatura kayıtları (Kayıt Bazlı Muhasebe Servisi).</p>

      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <input
          type="date"
          value={dateStart}
          onChange={(e) => setDateStart(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={dateEnd}
          onChange={(e) => setDateEnd(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Tüm durumlar</option>
          <option value="Paid">Ödenen (Paid)</option>
          <option value="WillBePaid">Ödenecek (WillBePaid)</option>
        </select>
        <select
          value={transactionType}
          onChange={(e) => setTransactionType(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Tüm tipler</option>
          <option value="Payment">Ödeme (Payment)</option>
          <option value="Commission">Komisyon</option>
          <option value="DeliveryProcessingFee">Kargo işlem ücreti</option>
          <option value="Return">İade</option>
        </select>
        <button
          onClick={load}
          disabled={loading}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 text-sm"
        >
          Sorgula
        </button>
        <Link href="/dashboard/api-settings" className="text-orange-600 hover:underline text-sm">
          API Ayarları
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
          {error}
          <p className="text-sm mt-1">Muhasebe yetkisi ve servis anahtarı gerekebilir.</p>
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
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Tip</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Açıklama</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Sipariş / Referans</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Tutar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((t, i) => (
                  <tr key={t.id ?? t.transactionId ?? i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm">
                      {t.paymentDate || t.recordDate || t.transactionDate
                        ? new Date(t.paymentDate || t.recordDate || t.transactionDate).toLocaleDateString("tr-TR")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm">{t.transactionType ?? t.type ?? "—"}</td>
                    <td className="px-4 py-3 text-sm">{t.description ?? "—"}</td>
                    <td className="px-4 py-3 text-sm">{t.orderNumber ?? t.referenceDocument ?? "—"}</td>
                    <td className="px-4 py-3 text-right text-sm">
                      {t.amount != null
                        ? formatMoney(t.amount)
                        : t.credit != null
                        ? formatMoney(t.credit)
                        : t.debit != null
                        ? formatMoney(-t.debit)
                        : "—"}
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
