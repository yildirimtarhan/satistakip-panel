"use client";

import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function TrendyolOrderDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError("");
    fetch(`/api/trendyol/orders/${id}`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data?.error) {
          setError(data.error);
          setOrder(null);
        } else {
          setOrder(data);
        }
      })
      .catch((err) => {
        setError(err.message || "Yüklenemedi");
        setOrder(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <p className="text-slate-500">Yükleniyor…</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 mb-4">
          {error || "Sipariş bulunamadı."}
        </div>
        <Link href="/dashboard/trendyol/orders" className="text-orange-600 hover:underline">
          ← Sipariş listesine dön
        </Link>
      </div>
    );
  }

  const orderNumber = order.orderNumber ?? order.shipmentPackageId ?? order.id ?? id;
  const customerName = [order.customerFirstName, order.customerLastName].filter(Boolean).join(" ") || order.customerEmail || "—";
  const lines = order.lines || [];
  const status = order.status ?? order.shipmentPackageStatus ?? "—";
  const totalPrice = order.packageTotalPrice ?? order.totalPrice ?? order.grossAmount ?? order.packageGrossAmount;

  const statusColor = (s) => {
    const t = String(s || "").toLowerCase();
    if (t.includes("created") || t.includes("yeni")) return "bg-amber-100 text-amber-800";
    if (t.includes("shipped") || t.includes("kargo")) return "bg-blue-100 text-blue-800";
    if (t.includes("delivered") || t.includes("teslim")) return "bg-green-100 text-green-800";
    if (t.includes("cancel")) return "bg-red-100 text-red-800";
    return "bg-slate-100 text-slate-700";
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/trendyol/orders" className="text-orange-600 hover:underline text-sm font-medium">
          ← Siparişler
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-orange-600 mb-2">Sipariş Detayı</h1>
      <p className="text-slate-500 mb-6">Sipariş No: {orderNumber}</p>

      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-slate-50">
            <h2 className="font-semibold text-slate-800">Genel Bilgiler</h2>
          </div>
          <div className="p-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Müşteri:</span>
              <p className="font-medium">{customerName}</p>
            </div>
            <div>
              <span className="text-slate-500">E-posta:</span>
              <p className="font-medium">{order.customerEmail || "—"}</p>
            </div>
            <div>
              <span className="text-slate-500">Durum:</span>
              <p>
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColor(status)}`}>
                  {status}
                </span>
              </p>
            </div>
            <div>
              <span className="text-slate-500">Tarih:</span>
              <p className="font-medium">
                {order.orderDate
                  ? new Date(order.orderDate).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" })
                  : "—"}
              </p>
            </div>
            <div>
              <span className="text-slate-500">Kargo:</span>
              <p className="font-medium">{order.cargoProviderName || "—"}</p>
            </div>
            <div>
              <span className="text-slate-500">Takip No:</span>
              <p className="font-medium">
                {order.cargoTrackingNumber ? (
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(order.cargoTrackingNumber)}+kargo`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {order.cargoTrackingNumber}
                  </a>
                ) : (
                  "—"
                )}
              </p>
            </div>
            <div>
              <span className="text-slate-500">Toplam:</span>
              <p className="font-medium text-lg">
                {totalPrice != null ? Number(totalPrice).toLocaleString("tr-TR", { minimumFractionDigits: 2 }) : "—"} ₺
              </p>
            </div>
          </div>
        </div>

        {order.shipmentAddress && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-slate-50">
              <h2 className="font-semibold text-slate-800">Teslimat Adresi</h2>
            </div>
            <div className="p-4 text-sm">
              <p className="font-medium">
                {order.shipmentAddress.fullName || [order.shipmentAddress.shippingFirstName, order.shipmentAddress.shippingLastName].filter(Boolean).join(" ")}
              </p>
              <p className="text-slate-600 mt-1">{order.shipmentAddress.fullAddress || order.shipmentAddress.address1}</p>
              <p className="text-slate-600">
                {[order.shipmentAddress.district, order.shipmentAddress.city].filter(Boolean).join(" / ")}
              </p>
              {order.shipmentAddress.phone && <p className="text-slate-600">{order.shipmentAddress.phone}</p>}
            </div>
          </div>
        )}

        {lines.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-slate-50">
              <h2 className="font-semibold text-slate-800">Sipariş Kalemleri</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left p-3 font-medium">Ürün</th>
                    <th className="text-left p-3 font-medium">Barkod</th>
                    <th className="text-right p-3 font-medium">Adet</th>
                    <th className="text-right p-3 font-medium">Birim Fiyat</th>
                    <th className="text-right p-3 font-medium">Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="p-3">{line.productName || "—"}</td>
                      <td className="p-3 font-mono text-xs">{line.barcode || line.sku || "—"}</td>
                      <td className="p-3 text-right">{line.quantity ?? 1}</td>
                      <td className="p-3 text-right">
                        {line.price != null ? Number(line.price).toLocaleString("tr-TR", { minimumFractionDigits: 2 }) : "—"} ₺
                      </td>
                      <td className="p-3 text-right">
                        {line.amount != null ? Number(line.amount).toLocaleString("tr-TR", { minimumFractionDigits: 2 }) : "—"} ₺
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <a
            href={`/api/trendyol/orders/kargo-etiket?orderNumber=${encodeURIComponent(orderNumber)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium text-sm"
          >
            Kargo Etiketi
          </a>
        </div>
      </div>
    </div>
  );
}
