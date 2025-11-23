// 📁 /pages/dashboard/n11/order/[orderNumber].js

import React from "react";
import dbConnect from "@/lib/mongodb";
import N11Order from "@/models/N11Order";

export async function getServerSideProps(context) {
  const { orderNumber } = context.params;

  await dbConnect();

  const doc = await N11Order.findOne({ orderNumber }).lean();

  if (!doc) {
    return {
      notFound: true,
    };
  }

  // _id ve tarihleri string'e çevir
  const order = {
    ...doc,
    _id: doc._id.toString(),
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : null,
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null,
  };

  return {
    props: {
      order,
    },
  };
}

export default function N11OrderDetailPage({ order }) {
  const buyer = order.buyer || {};
  const addr = order.shippingAddress || {};
  const items = order.items || [];
  const raw = order.raw || {};

  return (
    <div className="p-4 md:p-6">
      {/* Üst başlık ve geri dön butonu */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-orange-600">
            N11 Sipariş Detayı
          </h1>
          <p className="text-sm text-gray-500">
            Sipariş No: <span className="font-semibold">{order.orderNumber}</span>
          </p>
        </div>

        <button
          onClick={() => (window.location.href = "/dashboard/n11/orders")}
          className="text-sm px-3 py-2 rounded-md border border-gray-300 hover:bg-gray-100"
        >
          ← Sipariş listesine dön
        </button>
      </div>

      {/* Üst bilgi kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Sipariş Özeti */}
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <h2 className="font-semibold mb-2 text-gray-800">Sipariş Özeti</h2>
          <div className="text-sm space-y-1">
            <p>
              <span className="font-medium">Sipariş No:</span>{" "}
              {order.orderNumber || "-"}
            </p>
            <p>
              <span className="font-medium">Durum:</span>{" "}
              <span className="inline-flex px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                {order.status || raw.status || "-"}
              </span>
            </p>
            <p>
              <span className="font-medium">Sipariş Tarihi:</span>{" "}
              {raw.createDate || order.createdAt || "-"}
            </p>
            <p>
              <span className="font-medium">Toplam Tutar:</span>{" "}
              {order.totalPrice != null
                ? `${Number(order.totalPrice).toFixed(2)} ₺`
                : raw.totalAmount?.value
                ? `${raw.totalAmount.value} ${raw.totalAmount.currency || "₺"}`
                : "-"}
            </p>
            <p>
              <span className="font-medium">Oluşturma:</span>{" "}
              {order.createdAt ? new Date(order.createdAt).toLocaleString() : "-"}
            </p>
          </div>
        </div>

        {/* Müşteri Bilgileri */}
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <h2 className="font-semibold mb-2 text-gray-800">Müşteri Bilgileri</h2>
          <div className="text-sm space-y-1">
            <p>
              <span className="font-medium">Ad Soyad:</span>{" "}
              {buyer.fullName || buyer.name || "-"}
            </p>
            <p>
              <span className="font-medium">Telefon:</span>{" "}
              {buyer.gsm || buyer.phone || "-"}
            </p>
            <p>
              <span className="font-medium">E-posta:</span>{" "}
              {buyer.email || "-"}
            </p>
            {buyer.tckn && (
              <p>
                <span className="font-medium">TCKN / VKN:</span> {buyer.tckn}
              </p>
            )}
          </div>
        </div>

        {/* Teslimat Adresi */}
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <h2 className="font-semibold mb-2 text-gray-800">Teslimat Adresi</h2>
          <div className="text-sm space-y-1">
            <p>
              <span className="font-medium">Alıcı:</span>{" "}
              {addr.fullName || addr.name || buyer.fullName || "-"}
            </p>
            <p>
              <span className="font-medium">İl / İlçe:</span>{" "}
              {addr.city || "-"} / {addr.fullAddress?.district || addr.district || "-"}
            </p>
            <p className="break-words">
              <span className="font-medium">Adres:</span>{" "}
              {addr.fullAddress?.address || addr.address || "-"}
            </p>
            {addr.postalCode && (
              <p>
                <span className="font-medium">Posta Kodu:</span>{" "}
                {addr.postalCode}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Ürünler tablosu */}
      <div className="bg-white border rounded-lg p-4 shadow-sm mb-6">
        <h2 className="font-semibold mb-3 text-gray-800">Sipariş Ürünleri</h2>

        {items.length === 0 ? (
          <p className="text-sm text-gray-500">Bu siparişte ürün bulunamadı.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-xs uppercase text-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left">Ürün Adı</th>
                  <th className="px-3 py-2 text-left">SKU / Barkod</th>
                  <th className="px-3 py-2 text-right">Adet</th>
                  <th className="px-3 py-2 text-right">Fiyat</th>
                  <th className="px-3 py-2 text-right">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const q = Number(it.quantity || it.amount || 1);
                  const unitPrice =
                    Number(it.price || it.priceWithTax || 0) ||
                    Number(it.sellerInvoiceAmount?.value || 0);
                  const lineTotal = q * unitPrice;

                  return (
                    <tr
                      key={idx}
                      className="border-t hover:bg-gray-50 transition"
                    >
                      <td className="px-3 py-2 max-w-xs">
                        <div className="font-medium text-gray-900 truncate">
                          {it.productName || it.title || "-"}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {it.sellerProductCode || it.stockCode || ""}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700">
                        {it.sellerProductCode || it.stockCode || it.barcode || "-"}
                      </td>
                      <td className="px-3 py-2 text-right">{q}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {unitPrice
                          ? `${unitPrice.toFixed(2)} ₺`
                          : "-"}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {lineTotal
                          ? `${lineTotal.toFixed(2)} ₺`
                          : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* İşlem butonları ve Raw JSON */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* İşlemler */}
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <h2 className="font-semibold mb-3 text-gray-800">İşlemler</h2>
          <div className="flex flex-wrap gap-2">
            <button
              className="px-3 py-2 text-xs md:text-sm rounded-md bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-60"
              disabled
            >
              📦 Kargoya Ver (yakında)
            </button>
            <button
              className="px-3 py-2 text-xs md:text-sm rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-60"
              disabled
            >
              🔗 Cari ile Eşleştir (yakında)
            </button>
            <button
              className="px-3 py-2 text-xs md:text-sm rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200"
              onClick={() =>
                alert(
                  "Bu butonlar şimdilik pasif. Bir sonraki adımda Kargoya Ver ve Cari Eşleştirme fonksiyonlarını bağlayacağız."
                )
              }
            >
              ℹ Açıklama
            </button>
          </div>
        </div>

        {/* Raw JSON (debug için) */}
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <h2 className="font-semibold mb-2 text-gray-800 text-sm">
            Teknik Detay (Raw JSON)
          </h2>
          <p className="text-xs text-gray-500 mb-2">
            Sadece geliştirici amaçlıdır. N11&apos;den gelen ham veriyi gösterir.
          </p>
          <pre className="text-[11px] max-h-64 overflow-auto bg-gray-50 border rounded-md p-2">
            {JSON.stringify(raw, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
