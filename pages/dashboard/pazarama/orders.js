"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const ORDER_STATUS = {
  3: "Siparişiniz Alındı",
  5: "Siparişiniz Kargoya Verildi",
  6: "Siparişiniz İptal Edildi",
  7: "İade Süreci Başlatıldı",
  8: "İade Onaylandı",
  9: "İade Reddedildi",
  10: "İade Edildi",
  11: "Teslim Edildi",
  12: "Siparişiniz Hazırlanıyor",
  13: "Tedarik Edilemedi",
  14: "Teslim Edilemedi",
  16: "Siparişiniz Mağazada",
  18: "İptal Süreci Başlatıldı",
  19: "Siparişiniz Teslimat Noktasında",
};

function getStatusLabel(s) {
  if (s == null) return "-";
  return ORDER_STATUS[s] || `#${s}`;
}

export default function PazaramaOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [erpLoading, setErpLoading] = useState(false);
  const [invoiceModal, setInvoiceModal] = useState(null);
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [invoiceUrl, setInvoiceUrl] = useState("");
  const [invoiceSending, setInvoiceSending] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [orderNumber, setOrderNumber] = useState("");
  const [orderItemStatus, setOrderItemStatus] = useState("");

  const loadOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Giriş yapmanız gerekiyor.");
        return;
      }
      let sd = startDate;
      let ed = endDate;
      if (orderNumber.trim()) {
        const now = new Date();
        const past = new Date(now);
        past.setDate(past.getDate() - 180);
        sd = past.toISOString().slice(0, 10);
        ed = now.toISOString().slice(0, 10);
      }
      let params = `startDate=${sd}&endDate=${ed}&page=1&size=50`;
      if (orderNumber.trim()) params += `&orderNumber=${encodeURIComponent(orderNumber.trim())}`;
      if (orderItemStatus) params += `&orderItemStatus=${orderItemStatus}`;
      const url = `/api/pazarama/orders?${params}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Bağlantı hatası");
      setOrders(data.data || []);
    } catch (e) {
      setError(e.message);
      setOrders([]);
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
  }, []);

  const toggleSelect = (orderId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === orders.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(orders.map((o) => o.orderId || o.orderNumber || o.id).filter(Boolean)));
  };

  const handleErpPush = async () => {
    const toPush = orders.filter((o) => selectedIds.has(o.orderId || o.orderNumber || o.id));
    if (!toPush.length) {
      alert("Lütfen aktarılacak siparişleri seçin.");
      return;
    }
    setErpLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/pazarama/orders/create-erp", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orders: toPush }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "İşlem başarısız");
      alert(data.message || `${data.salesCreated} sipariş Cariye aktarıldı.`);
      setSelectedIds(new Set());
      if (data.salesCreated > 0) loadOrders();
    } catch (e) {
      alert(e.message || "ERP aktarımı sırasında hata oluştu.");
    } finally {
      setErpLoading(false);
    }
  };

  const openInvoiceModal = (order) => {
    const oid = order.orderId || order.orderNumber || order.id;
    if (!oid) return;
    setInvoiceModal(oid);
    setInvoiceUrl("");
    setInvoiceFile(null);
  };

  const handleSendInvoice = async () => {
    const oid = invoiceModal;
    if (!oid) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    let invoiceLink = invoiceUrl.trim() || null;
    if (invoiceFile) {
      const reader = new FileReader();
      const base64 = await new Promise((resolve, reject) => {
        reader.onload = () => {
          const b = reader.result;
          const m = typeof b === "string" && b.match(/^data:application\/pdf;base64,(.+)$/);
          resolve(m ? m[1] : (b && b.split(",")[1]) || null);
        };
        reader.onerror = reject;
        reader.readAsDataURL(invoiceFile);
      });
      if (!base64) {
        alert("PDF okunamadı.");
        return;
      }
      setInvoiceSending(true);
      try {
        const uploadRes = await fetch("/api/pazaryeri-fatura", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ marketplace: "pazarama", orderNumber: String(oid), pdf: base64 }),
        });
        const uploadData = await uploadRes.json();
        if (uploadData.url) invoiceLink = uploadData.url;
        else throw new Error(uploadData.message || "Fatura yüklenemedi");
      } catch (e) {
        alert(e.message || "Fatura yüklenemedi.");
        setInvoiceSending(false);
        return;
      }
    }
    if (!invoiceLink) {
      alert("PDF dosyası yükleyin veya fatura URL girin.");
      return;
    }
    setInvoiceSending(true);
    try {
      const res = await fetch("/api/pazarama/orders/invoice-link", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId: oid, invoiceLink }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "İşlem başarısız");
      alert(data.message || "E-Fatura linki güncellendi.");
      setInvoiceModal(null);
    } catch (e) {
      alert(e.message || "Gönderilemedi.");
    } finally {
      setInvoiceSending(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Pazarama Siparişler</h1>
      <p className="text-sm text-gray-500 mb-4">Tarih aralığı max 1 ay. Sipariş no ile aramada son 6 ay taranır.</p>

      <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Başlangıç</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Bitiş</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Sipariş No</label>
          <input
            type="text"
            placeholder="735071747"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            className="border rounded px-3 py-2 w-36"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Statü</label>
          <select
            value={orderItemStatus}
            onChange={(e) => setOrderItemStatus(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="">Tümü</option>
            {Object.entries(ORDER_STATUS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <button
          onClick={loadOrders}
          disabled={loading}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
        >
          {loading ? "Yükleniyor..." : "Siparişleri Getir"}
        </button>
        <Link href="/dashboard/pazarama/accounting" className="text-orange-600 hover:underline text-sm py-2">
          Muhasebe & Finans
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">{error}</div>
      )}

      {loading ? (
        <div className="text-gray-500 py-8">Yükleniyor...</div>
      ) : orders.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 p-8 rounded-lg text-gray-600 text-center">
          Bu tarih aralığında sipariş bulunamadı.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-3 bg-gray-50 border-b flex items-center gap-3">
            <button
              onClick={handleErpPush}
              disabled={erpLoading || selectedIds.size === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {erpLoading ? "Aktarılıyor..." : `Seçilenleri Cariye Aktar (${selectedIds.size})`}
            </button>
            <span className="text-sm text-gray-600">
              Siparişleri seçip Cariye aktararak satış ve Pazarama borç kaydı oluşturulur.
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={orders.length > 0 && selectedIds.size === orders.length}
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sipariş No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Müşteri</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tutar</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((o, i) => {
                  const oid = o.orderId || o.orderNumber || o.id;
                  return (
                  <tr key={oid || i} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {oid && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(oid)}
                          onChange={() => toggleSelect(oid)}
                          className="rounded"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">{o.orderNumber || o.orderId || "-"}</td>
                    <td className="px-4 py-3 text-gray-600">{o.customerName || "-"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 text-xs rounded bg-orange-100 text-orange-800">
                        {getStatusLabel(o.orderStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {o.orderAmount != null ? `₺${Number(o.orderAmount).toFixed(2)}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{o.orderDate || "-"}</td>
<td className="px-4 py-3">
                        <a href={`/api/pazarama/orders/kargo-etiket?orderNumber=${encodeURIComponent(oid)}`} target="_blank" rel="noopener noreferrer" className="text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded hover:bg-amber-200 mr-2">Kargo Etiketi (A5)</a>
                        <button
                          type="button"
                          onClick={() => openInvoiceModal(o)}
                          disabled={invoiceModal === (oid || "") || invoiceSending}
                          className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                        >
                          E-Fatura Yükle
                        </button>
                    </td>
                  </tr>
                );})}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {invoiceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !invoiceSending && setInvoiceModal(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-4">E-Fatura Yükle — {invoiceModal}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PDF URL (isteğe bağlı)</label>
                <input type="url" value={invoiceUrl} onChange={(e) => setInvoiceUrl(e.target.value)} placeholder="https://..." className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">veya PDF dosyası</label>
                <input type="file" accept="application/pdf" onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)} className="w-full text-sm" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={handleSendInvoice} disabled={invoiceSending} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 text-sm font-medium">
                {invoiceSending ? "Gönderiliyor..." : "Gönder"}
              </button>
              <button type="button" onClick={() => setInvoiceModal(null)} disabled={invoiceSending} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm">İptal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
