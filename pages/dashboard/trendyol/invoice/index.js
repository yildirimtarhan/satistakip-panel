"use client";

import { useState } from "react";
import Link from "next/link";

export default function TrendyolInvoicePage() {
  const [form, setForm] = useState({
    shipmentPackageId: "",
    invoiceLink: "",
    invoiceNumber: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.shipmentPackageId || !form.invoiceLink) {
      alert("Paket ID ve fatura linki zorunlu.");
      return;
    }
    setLoading(true);
    setMessage("");
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/trendyol/invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          shipmentPackageId: form.shipmentPackageId,
          invoiceLink: form.invoiceLink,
          invoiceNumber: form.invoiceNumber || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Fatura linki gönderilemedi");
      setMessage("Fatura linki başarıyla gönderildi.");
      setForm({ shipmentPackageId: "", invoiceLink: "", invoiceNumber: "" });
    } catch (e) {
      setMessage("Hata: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-orange-600 mb-2">Fatura Entegrasyonu</h1>
      <p className="text-slate-600 mb-6">
        Sipariş paketine fatura linki (e-Arşiv/e-Fatura URL) gönderin. Link 10 yıl erişilebilir olmalıdır.
      </p>
      <div className="flex gap-3 mb-6">
        <Link href="/dashboard/trendyol/orders" className="text-orange-600 hover:underline">
          Siparişler
        </Link>
        <Link href="/dashboard/api-settings?tab=trendyol" className="text-orange-600 hover:underline">
          API Ayarları
        </Link>
      </div>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Shipment Package ID *</label>
          <input
            type="number"
            value={form.shipmentPackageId}
            onChange={(e) => setForm((f) => ({ ...f, shipmentPackageId: e.target.value }))}
            placeholder="Örn: 12345678"
            className="w-full border rounded-lg px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Fatura Link (URL) *</label>
          <input
            type="url"
            value={form.invoiceLink}
            onChange={(e) => setForm((f) => ({ ...f, invoiceLink: e.target.value }))}
            placeholder="https://..."
            className="w-full border rounded-lg px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Fatura No (opsiyonel)</label>
          <input
            value={form.invoiceNumber}
            onChange={(e) => setForm((f) => ({ ...f, invoiceNumber: e.target.value }))}
            placeholder="FRY2024567890123"
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
        >
          {loading ? "Gönderiliyor…" : "Fatura Linki Gönder"}
        </button>
        {message && (
          <p className={`text-sm ${message.startsWith("Hata") ? "text-red-600" : "text-green-600"}`}>
            {message}
          </p>
        )}
      </form>
    </div>
  );
}
