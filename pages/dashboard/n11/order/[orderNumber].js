// 📁 /pages/dashboard/n11/order/[orderNumber].js

import React, { useState } from "react";
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

  const order = {
    ...doc,
    _id: doc._id.toString(),
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : null,
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null,
  };

  return {
    props: { order },
  };
}

export default function N11OrderDetailPage({ order }) {
  const buyer = order.buyer || {};
  const addr = order.shippingAddress || {};
  const items = order.items || [];
  const raw = order.raw || {};

  // 📦 KARGO POPUP STATES
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [shipmentCompany, setShipmentCompany] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [isSending, setIsSending] = useState(false);

  const sendShipment = async () => {
    if (!shipmentCompany || !trackingNumber) {
      alert("Kargo firması ve takip numarası zorunludur!");
      return;
    }

    setIsSending(true);

    try {
      const res = await fetch("/api/n11/orders/shipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: order.orderNumber,
          shipmentCompany,
          trackingNumber,
        }),
      });

      const data = await res.json();
      alert(data.message || "İşlem tamamlandı!");

      setShowShipmentModal(false);
      setShipmentCompany("");
      setTrackingNumber("");
    } catch (err) {
      alert("Kargo bildirimi gönderilemedi!");
    }

    setIsSending(false);
  };

  return (
    <div className="p-4 md:p-6">
      {/* Üst başlık */}
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

      {/* KARTLAR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* SİPARİŞ ÖZETİ */}
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <h2 className="font-semibold mb-2 text-gray-800">Sipariş Özeti</h2>
          <div className="text-sm space-y-1">
            <p><span className="font-medium">Sipariş No:</span> {order.orderNumber}</p>
            <p>
              <span className="font-medium">Durum:</span>{" "}
              <span className="inline-flex px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                {order.status || raw.status || "-"}
              </span>
            </p>
            <p><span className="font-medium">Sipariş Tarihi:</span> {raw.createDate || "-"}</p>
            <p>
              <span className="font-medium">Toplam Tutar:</span>{" "}
              {order.totalPrice != null
                ? `${Number(order.totalPrice).toFixed(2)} ₺`
                : "-"}
            </p>
          </div>
        </div>

        {/* MÜŞTERİ */}
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <h2 className="font-semibold mb-2 text-gray-800">Müşteri Bilgileri</h2>
          <div className="text-sm space-y-1">
            <p><span className="font-medium">Ad Soyad:</span> {buyer.fullName || "-"}</p>
            <p><span className="font-medium">Telefon:</span> {buyer.gsm || "-"}</p>
            <p><span className="font-medium">E-posta:</span> {buyer.email || "-"}</p>
          </div>
        </div>

        {/* ADRES */}
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <h2 className="font-semibold mb-2 text-gray-800">Teslimat Adresi</h2>
          <div className="text-sm space-y-1">
            <p><span className="font-medium">Alıcı:</span> {addr.fullName || "-"}</p>
            <p><span className="font-medium">İl / İlçe:</span> {addr.city} / {addr.district}</p>
            <p className="break-words">
              <span className="font-medium">Adres:</span> {addr.address}
            </p>
            <p><span className="font-medium">Posta Kodu:</span> {addr.postalCode}</p>
          </div>
        </div>
      </div>

      {/* ÜRÜNLER */}
      <div className="bg-white border rounded-lg p-4 shadow-sm mb-6">
        <h2 className="font-semibold mb-3 text-gray-800">Sipariş Ürünleri</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-xs uppercase text-gray-600">
              <tr>
                <th className="px-3 py-2 text-left">Ürün Adı</th>
                <th className="px-3 py-2 text-left">SKU</th>
                <th className="px-3 py-2 text-right">Adet</th>
                <th className="px-3 py-2 text-right">Fiyat</th>
                <th className="px-3 py-2 text-right">Tutar</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => {
                const q = Number(it.quantity || 1);
                const unitPrice = Number(it.price || 0);
                const total = q * unitPrice;

                return (
                  <tr key={idx} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2">{it.productName}</td>
                    <td className="px-3 py-2">{it.sellerProductCode || "-"}</td>
                    <td className="px-3 py-2 text-right">{q}</td>
                    <td className="px-3 py-2 text-right">{unitPrice.toFixed(2)} ₺</td>
                    <td className="px-3 py-2 text-right">{total.toFixed(2)} ₺</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* İŞLEMLER */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sol kart */}
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <h2 className="font-semibold mb-3 text-gray-800">İşlemler</h2>

          <div className="flex flex-wrap gap-2">
            {/* 📦 KARGOYU AKTİF ETTİK */}
            <button
              onClick={() => setShowShipmentModal(true)}
              className="px-3 py-2 text-sm rounded-md bg-orange-500 text-white hover:bg-orange-600"
            >
              📦 Kargoya Ver
            </button>

            <button
              className="px-3 py-2 text-sm rounded-md bg-blue-500 text-white opacity-60"
              disabled
            >
              🔗 Cari Eşleştir (yakında)
            </button>
          </div>
        </div>

        {/* RAW JSON */}
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <h2 className="font-semibold mb-2 text-gray-800 text-sm">
            Teknik Detay (Raw JSON)
          </h2>
          <pre className="text-[11px] max-h-64 overflow-auto bg-gray-50 border rounded-md p-2">
            {JSON.stringify(raw, null, 2)}
          </pre>
        </div>
      </div>

      {/* 📦 KARGO POPUP MODAL */}
      {showShipmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-[400px]">
            <h2 className="text-xl font-bold mb-4 text-orange-600">📦 Kargoya Ver</h2>

            <label className="block font-semibold mb-1">Kargo Firması</label>
            <select
              className="border p-2 rounded w-full mb-3"
              value={shipmentCompany}
              onChange={(e) => setShipmentCompany(e.target.value)}
            >
              <option value="">Seçiniz...</option>
              <option value="Yurtiçi">Yurtiçi Kargo</option>
              <option value="Aras">Aras Kargo</option>
              <option value="MNG">MNG Kargo</option>
              <option value="PTT">PTT Kargo</option>
              <option value="Surat">Sürat Kargo</option>
            </select>

            <label className="block font-semibold mb-1">Takip Numarası</label>
            <input
              type="text"
              className="border p-2 rounded w-full mb-4"
              placeholder="Takip No"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowShipmentModal(false)}
                className="px-4 py-2 border rounded-lg"
              >
                İptal
              </button>

              <button
                disabled={isSending}
                onClick={sendShipment}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg"
              >
                {isSending ? "Gönderiliyor..." : "Gönder"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
