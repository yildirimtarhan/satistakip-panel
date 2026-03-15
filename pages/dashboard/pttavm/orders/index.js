"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

/** PTT AVM siparişler – multi-tenant, kargo etiketi (A5), e-fatura yükleme. */
export default function PttAvmOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isActiveOrders, setIsActiveOrders] = useState(false);
  const [noShipLoading, setNoShipLoading] = useState(null);
  const [invoiceModal, setInvoiceModal] = useState(null);
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [invoiceUrl, setInvoiceUrl] = useState("");
  const [invoiceSending, setInvoiceSending] = useState(false);
  const [lineItemIds, setLineItemIds] = useState([]);

  const loadOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Giriş yapmanız gerekiyor.");
        setOrders([]);
        setLoading(false);
        return;
      }
      const params = new URLSearchParams({ startDate, endDate, isActiveOrders: String(isActiveOrders) });
      const res = await fetch(`/api/pttavm/orders/search?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Bağlantı hatası");
      setOrders(Array.isArray(data.orders) ? data.orders : []);
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

  const handleNoShippingDelivered = async (orderId) => {
    const id = orderId || orderId?.siparisNo || orderId?.orderId;
    if (!id) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    setNoShipLoading(id);
    try {
      const res = await fetch("/api/pttavm/shipment/update-no-shipping-order", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ order_id: String(id) }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || "Sipariş teslim edildi olarak güncellendi.");
        loadOrders();
      } else {
        alert(data.message || "İşlem başarısız.");
      }
    } catch (e) {
      alert(e.message || "İstek gönderilemedi.");
    } finally {
      setNoShipLoading(null);
    }
  };

  const getOrderId = (o) => o?.siparisNo ?? o?.orderId ?? o?.id ?? o?.order_id ?? "-";
  const getCustomer = (o) => o?.musteriAdi ?? o?.customerName ?? o?.musteri ?? "-";
  const getDate = (o) => o?.siparisTarihi ?? o?.orderDate ?? o?.tarih ?? "-";
  const getStatus = (o) => o?.durum ?? o?.status ?? o?.orderStatus ?? "-";

  const openInvoiceModal = async (order) => {
    const oid = getOrderId(order);
    setInvoiceModal(oid);
    setInvoiceUrl("");
    setInvoiceFile(null);
    setLineItemIds([]);
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`/api/pttavm/orders/${encodeURIComponent(oid)}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const raw = data.order;
      const orderData = Array.isArray(raw) ? raw[0] : raw;
      const items = orderData?.siparisUrunler || orderData?.lineItems || [];
      const ids = items.map((x) => x.lineItemId ?? x.line_item_id).filter((n) => n != null && n !== "");
      setLineItemIds(ids);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendInvoice = async () => {
    const oid = invoiceModal;
    if (!oid || !lineItemIds.length) {
      alert("Sipariş detayı veya fatura kalemi bulunamadı.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) return;
    let content = null;
    let url = invoiceUrl.trim() || null;
    if (invoiceFile) {
      const reader = new FileReader();
      content = await new Promise((resolve, reject) => {
        reader.onload = () => {
          const b = reader.result;
          const base64 = typeof b === "string" && b.startsWith("data:") ? b.split(",")[1] : b;
          resolve(base64 || null);
        };
        reader.onerror = reject;
        reader.readAsDataURL(invoiceFile);
      });
    }
    if (!content && !url) {
      alert("PDF dosyası yükleyin veya fatura URL girin.");
      return;
    }
    setInvoiceSending(true);
    try {
      const res = await fetch(`/api/pttavm/orders/${encodeURIComponent(oid)}/invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId: oid, lineItemId: lineItemIds, content: content || undefined, url: url || undefined }),
      });
      const data = await res.json();
      if (data.success !== false) {
        alert("E-Fatura gönderildi.");
        setInvoiceModal(null);
      } else {
        alert(data.message || data.error_Message || "Gönderilemedi.");
      }
    } catch (e) {
      alert(e.message || "İstek gönderilemedi.");
    } finally {
      setInvoiceSending(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-orange-600 mb-2">PTT AVM Siparişler</h1>
      <p className="text-sm text-gray-500 mb-6">Tarih aralığı max 40 gün. Multi-tenant: firmanıza ait PTT AVM API ayarları kullanılır.</p>

      <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Başlangıç</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Bitiş</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border rounded px-3 py-2" />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="activeOnly"
            checked={isActiveOrders}
            onChange={(e) => setIsActiveOrders(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="activeOnly" className="text-sm text-gray-600">Sadece kargo bekleyenler</label>
        </div>
        <button
          onClick={loadOrders}
          disabled={loading}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
        >
          {loading ? "Yükleniyor..." : "Siparişleri Getir"}
        </button>
        <Link href="/dashboard/api-settings?tab=pttavm" className="text-orange-600 hover:underline text-sm py-2">API Ayarları</Link>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">{error}</div>}

      {loading ? (
        <div className="text-gray-500 py-8">Yükleniyor...</div>
      ) : orders.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 p-8 rounded-lg text-gray-600 text-center">Bu tarih aralığında sipariş bulunamadı.</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sipariş No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Müşteri</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((o, i) => {
                  const oid = getOrderId(o);
                  return (
                    <tr key={oid || i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{oid}</td>
                      <td className="px-4 py-3 text-gray-600">{getCustomer(o)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 text-xs rounded bg-orange-100 text-orange-800">{getStatus(o)}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{getDate(o)}</td>
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/pttavm/orders/${encodeURIComponent(oid)}`} className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 mr-2">Detay</Link>
                        <a href={`/api/pttavm/orders/kargo-etiket?orderId=${encodeURIComponent(oid)}`} target="_blank" rel="noopener noreferrer" className="text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded hover:bg-amber-200 mr-2">Kargo Etiketi (A5)</a>
                        <button type="button" onClick={() => openInvoiceModal(o)} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 mr-2">E-Fatura Yükle</button>
                        <button
                          type="button"
                          onClick={() => handleNoShippingDelivered(oid)}
                          disabled={noShipLoading === oid}
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                        >
                          {noShipLoading === oid ? "..." : "Teslim edildi (no-shipping)"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {invoiceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !invoiceSending && setInvoiceModal(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-4">E-Fatura Yükle — {invoiceModal}</h3>
            {lineItemIds.length === 0 && <p className="text-sm text-amber-600 mb-2">Sipariş kalemleri alınamadı; yine de URL ile deneyebilirsiniz.</p>}
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
              <button type="button" onClick={handleSendInvoice} disabled={invoiceSending} className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 text-sm font-medium">
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
