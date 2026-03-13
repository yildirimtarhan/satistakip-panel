"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const CARGO_COMPANIES = [
  { id: 1, name: "Yurtiçi Kargo" },
  { id: 10, name: "Aras Kargo" },
  { id: 2003, name: "Trendyol Express" },
  { id: 11, name: "MNG Kargo" },
  { id: 12, name: "PTT Kargo" },
  { id: 13, name: "Sürat Kargo" },
];

export default function TrendyolDeliveryPage() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(null);
  const [form, setForm] = useState({});

  const fetchPackages = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/trendyol/shipment-packages", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Paketler yüklenemedi");
      setPackages(data.packages || []);
    } catch (e) {
      setError(e.message);
      setPackages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleSubmit = async (pkg) => {
    const tracking = form[pkg.orderNumber || pkg.shipmentPackageId]?.tracking?.trim();
    const cargoId = form[pkg.orderNumber || pkg.shipmentPackageId]?.cargoId;
    if (!tracking || !cargoId) {
      alert("Takip no ve kargo firması girin.");
      return;
    }
    setSending(pkg.orderNumber || pkg.shipmentPackageId);
    try {
      const lines = (pkg.lines || []).map((l) => ({
        orderLineId: l.orderLineId ?? l.id,
        quantity: l.quantity ?? 1,
      }));
      const token = localStorage.getItem("token");
      const res = await fetch("/api/trendyol/orders/shipment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          orderNumber: pkg.orderNumber ?? pkg.id,
          cargoTrackingNumber: tracking,
          cargoCompanyId: Number(cargoId),
          items: lines.length ? lines : [{ orderLineId: pkg.lines?.[0]?.orderLineId, quantity: 1 }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.raw?.message || "Kargo bildirimi başarısız");
      alert("Kargo bildirimi gönderildi.");
      setForm((f) => {
        const next = { ...f };
        delete next[pkg.orderNumber || pkg.shipmentPackageId];
        return next;
      });
      fetchPackages();
    } catch (e) {
      alert(e.message || "Hata oluştu.");
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-orange-600 mb-2">Teslimat Entegrasyonu</h1>
      <p className="text-slate-600 mb-6">
        Kargo bekleyen siparişlere takip numarası girerek bildirim gönderin.
      </p>

      <div className="flex gap-3 mb-6">
        <button
          onClick={fetchPackages}
          disabled={loading}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
        >
          {loading ? "Yükleniyor…" : "Yenile"}
        </button>
        <Link
          href="/dashboard/trendyol/orders"
          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
        >
          Siparişlere Git
        </Link>
        <Link
          href="/dashboard/api-settings?tab=trendyol"
          className="px-4 py-2 text-orange-600 hover:underline"
        >
          API Ayarları
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-slate-50 font-semibold text-slate-800">
          Kargo Bekleyen Paketler ({packages.length})
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-500">Yükleniyor…</div>
        ) : packages.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            Kargo bekleyen paket yok veya API ayarlarını kontrol edin.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {packages.map((pkg) => {
              const key = pkg.orderNumber ?? pkg.shipmentPackageId ?? pkg.id;
              const f = form[key] || {};
              return (
                <div key={key} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800">#{key}</p>
                    <p className="text-sm text-slate-500">
                      {pkg.lines?.[0]?.productName || pkg.lines?.[0]?.productCode || "—"} ·{" "}
                      {[pkg.customerFirstName, pkg.customerLastName].filter(Boolean).join(" ") || "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 items-end">
                    <input
                      placeholder="Takip no"
                      value={f.tracking || ""}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          [key]: { ...prev[key], tracking: e.target.value },
                        }))
                      }
                      className="border rounded-lg px-3 py-2 w-40 text-sm"
                    />
                    <select
                      value={f.cargoId || ""}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          [key]: { ...prev[key], cargoId: e.target.value },
                        }))
                      }
                      className="border rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">Kargo seçin</option>
                      {CARGO_COMPANIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleSubmit(pkg)}
                      disabled={sending === key || !f.tracking || !f.cargoId}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 text-sm font-medium"
                    >
                      {sending === key ? "Gönderiliyor…" : "Kargo Bildir"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
