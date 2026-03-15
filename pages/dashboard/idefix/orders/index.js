"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const STATUS_MAP = {
  created: "Oluşturuldu",
  shipment_ready: "Hazırlanıyor",
  shipment_picking: "Toplanıyor",
  shipment_invoiced: "Faturalandı",
  shipment_cancelled: "İptal",
  shipment_unsupplied: "Temin Edilemedi",
  shipment_split: "Parçalı",
  shipment_in_cargo: "Kargoda",
  shipment_delivered: "Teslim Edildi",
  shipment_undeliver: "Teslim Edilemedi",
  shipment_approved: "Onaylandı",
};

export default function IdefixOrdersPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [state, setState] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageCount, setPageCount] = useState(0);

  const loadOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Giriş yapmanız gerekiyor.");
        setItems([]);
        setLoading(false);
        return;
      }
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (state) params.set("state", state);
      if (orderNumber) params.set("orderNumber", orderNumber);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const res = await fetch(`/api/idefix/orders/list?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Bağlantı hatası");
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotalCount(data.totalCount ?? 0);
      setPageCount(data.pageCount ?? 0);
    } catch (e) {
      setError(e.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    loadOrders();
  }, [page]);

  const getStatusLabel = (s) => (s ? (STATUS_MAP[s] || s) : "—");

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-amber-700 mb-2">İdefix Siparişler (Sevkiyatlar)</h1>
      <p className="text-sm text-gray-500 mb-6">
        Ödeme kontrolünden geçmiş sevkiyatlar. Test ortamı kullanıyorsanız API Ayarları’nda Test modu açık olsun.
      </p>

      <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Sipariş No</label>
          <input type="text" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="IDE64..." className="border rounded px-3 py-2 w-40" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Durum</label>
          <select value={state} onChange={(e) => setState(e.target.value)} className="border rounded px-3 py-2">
            <option value="">Tümü</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Başlangıç</label>
          <input type="text" value={startDate} onChange={(e) => setStartDate(e.target.value)} placeholder="2022/09/30 23:59:59" className="border rounded px-3 py-2 w-44" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Bitiş</label>
          <input type="text" value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="2022/09/30 23:59:59" className="border rounded px-3 py-2 w-44" />
        </div>
        <button onClick={loadOrders} disabled={loading} className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50">
          {loading ? "Yükleniyor..." : "Listele"}
        </button>
        <Link href="/dashboard/api-settings?tab=idefix" className="text-amber-600 hover:underline text-sm py-2">API Ayarları</Link>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">{error}</div>}

      {loading && items.length === 0 ? (
        <div className="text-gray-500 py-8">Yükleniyor...</div>
      ) : items.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 p-8 rounded-lg text-gray-600 text-center">Sevkiyat bulunamadı.</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sipariş No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Müşteri</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tutar</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((o, i) => (
                  <tr key={o.id || i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{o.orderNumber || o.id || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{o.customerContactName || o.invoiceAddress?.fullName || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 text-xs rounded bg-amber-100 text-amber-800">{getStatusLabel(o.status)}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{o.discountedTotalPrice != null ? `₺${Number(o.discountedTotalPrice).toFixed(2)}` : "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{o.orderDate || o.createdAt || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pageCount > 1 && (
            <div className="p-3 border-t flex justify-between items-center">
              <span className="text-sm text-gray-500">Toplam {totalCount} kayıt</span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1 border rounded text-sm disabled:opacity-50">Önceki</button>
                <span className="px-3 py-1 text-sm">Sayfa {page} / {pageCount}</span>
                <button onClick={() => setPage((p) => p + 1)} disabled={page >= pageCount} className="px-3 py-1 border rounded text-sm disabled:opacity-50">Sonraki</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
