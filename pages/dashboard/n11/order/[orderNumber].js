// 📁 /pages/dashboard/n11/order/[orderNumber].js

import React, { useState } from "react";
import dbConnect from "@/lib/mongodb";
import N11Order from "@/models/N11Order";
import Cari from "@/models/Cari";

export async function getServerSideProps(context) {
  const { orderNumber } = context.params;

  await dbConnect();

  const doc = await N11Order.findOne({ orderNumber }).lean();

  if (!doc) {
    return { notFound: true };
  }

  let linkedCari = null;
  if (doc.accountId) {
    const c = await Cari.findById(doc.accountId).lean();
    if (c) {
      linkedCari = {
        _id: c._id.toString(),
        ad: c.ad,
        telefon: c.telefon,
        email: c.email,
      };
    }
  }

  const order = {
    ...doc,
    _id: doc._id.toString(),
    accountId: doc.accountId ? doc.accountId.toString() : null,
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : null,
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null,
  };

  return {
    props: {
      order,
      linkedCari: linkedCari || null,
    },
  };
}

export default function N11OrderDetailPage({ order, linkedCari }) {
  const buyer = order.buyer || {};
  const addr = order.shippingAddress || {};
  const items = order.items || [];
  const raw = order.raw || {};

  // 📦 KARGO POPUP STATES
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [shipmentCompany, setShipmentCompany] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [isSendingShipment, setIsSendingShipment] = useState(false);

  // 🔗 CARİ POPUP STATES
  const [showCariModal, setShowCariModal] = useState(false);
  const [cariLoading, setCariLoading] = useState(false);
  const [cariResults, setCariResults] = useState([]);
  const [selectedCariId, setSelectedCariId] = useState("");
  const [currentCari, setCurrentCari] = useState(linkedCari);
  {/* YENİ CARI OLUŞTURMA BÖLÜMÜ */}
<div className="mt-5 border-t pt-4">
  <h3 className="text-md font-semibold text-orange-600 mb-2">
    ➕ Yeni Cari Oluştur
  </h3>

  <label className="block text-sm font-medium">Ad Soyad</label>
  <input
    type="text"
    className="border p-2 rounded w-full mb-2"
    defaultValue={buyer.fullName || ""}
    id="newCariAd"
  />

  <label className="block text-sm font-medium">Telefon</label>
  <input
    type="text"
    className="border p-2 rounded w-full mb-2"
    defaultValue={buyer.gsm || ""}
    id="newCariTel"
  />

  <label className="block text-sm font-medium">E-posta</label>
  <input
    type="email"
    className="border p-2 rounded w-full mb-2"
    defaultValue={buyer.email || ""}
    id="newCariEmail"
  />

  <label className="block text-sm font-medium">İl</label>
  <input
    type="text"
    className="border p-2 rounded w-full mb-2"
    defaultValue={addr.city || ""}
    id="newCariIl"
  />

  <label className="block text-sm font-medium">İlçe</label>
  <input
    type="text"
    className="border p-2 rounded w-full mb-2"
    defaultValue={addr.district || ""}
    id="newCariIlce"
  />

  <label className="block text-sm font-medium">Adres</label>
  <textarea
    className="border p-2 rounded w-full mb-3"
    defaultValue={addr.address || ""}
    id="newCariAdres"
  />

  <button
    onClick={async () => {
      const ad = document.getElementById("newCariAd").value;
      const telefon = document.getElementById("newCariTel").value;
      const email = document.getElementById("newCariEmail").value;
      const il = document.getElementById("newCariIl").value;
      const ilce = document.getElementById("newCariIlce").value;
      const adres = document.getElementById("newCariAdres").value;

      const res = await fetch("/api/cari/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
  ad,
  telefon,
  email,
  il,
  ilce,
  adres,
  n11CustomerId: order.orderNumber, // ✅ DOĞRU FIELD
}),
      });

      const data = await res.json();
      if (!data.success) {
        alert(data.message || "Cari oluşturulamadı");
        return;
      }

      // ✔ Oluşan cariyi siparişe bağlayalım
      await fetch("/api/cari/link-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: order.orderNumber,
          cariId: data.cari._id,
        }),
      });

      alert("Yeni cari oluşturuldu ve siparişle eşleştirildi!");
      window.location.reload();
    }}
    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg w-full"
  >
    💾 Yeni Cari Oluştur ve Bağla
  </button>
</div>


  const hasLinkedCari = !!currentCari;

  const sendShipment = async () => {
    if (!shipmentCompany || !trackingNumber) {
      alert("Kargo firması ve takip numarası zorunludur!");
      return;
    }

    setIsSendingShipment(true);

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

    setIsSendingShipment(false);
  };

  // 🔍 Cari arama
  const searchCari = async () => {
    setCariLoading(true);
    try {
      const res = await fetch("/api/cari/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: buyer.email || "",
          phone: buyer.gsm || "",
          fullName: buyer.fullName || "",
        }),
      });

      const data = await res.json();
      if (!data.success) {
        alert(data.message || "Cari arama başarısız");
        setCariResults([]);
      } else {
        setCariResults(data.results || []);
        if (data.results && data.results.length === 1) {
          setSelectedCariId(data.results[0]._id);
        }
      }
    } catch (err) {
      console.error("Cari arama hatası:", err);
      alert("Cari arama sırasında hata oluştu");
    }
    setCariLoading(false);
  };

  const openCariModal = () => {
    setShowCariModal(true);
    searchCari();
  };

  // 🔗 Siparişi cariye bağla
  const linkOrderToCari = async () => {
    if (!selectedCariId) {
      alert("Lütfen listeden bir cari seçin.");
      return;
    }

    setCariLoading(true);
    try {
      const res = await fetch("/api/cari/link-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: order.orderNumber,
          cariId: selectedCariId,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        alert(data.message || "Eşleştirme başarısız");
      } else {
        alert(data.message || "Cari ile eşleştirildi");
        setCurrentCari(data.cari || null);
        setShowCariModal(false);
      }
    } catch (err) {
      console.error("Cari eşleştirme hatası:", err);
      alert("Cari eşleştirme sırasında hata oluştu");
    }
    setCariLoading(false);
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
            Sipariş No:{" "}
            <span className="font-semibold">{order.orderNumber}</span>
          </p>
          {hasLinkedCari && (
            <p className="text-xs text-green-700 mt-1">
              🔗 Bağlı Cari:{" "}
              <span className="font-semibold">{currentCari.ad}</span> (
              {currentCari.telefon || currentCari.email || "-"})
            </p>
          )}
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
            <p>
              <span className="font-medium">Sipariş No:</span>{" "}
              {order.orderNumber}
            </p>
            <p>
              <span className="font-medium">Durum:</span>{" "}
              <span className="inline-flex px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                {order.status || raw.status || "-"}
              </span>
            </p>
            <p>
              <span className="font-medium">Sipariş Tarihi:</span>{" "}
              {raw.createDate || "-"}
            </p>
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
          <h2 className="font-semibold mb-2 text-gray-800">
            Müşteri Bilgileri
          </h2>
          <div className="text-sm space-y-1">
            <p>
              <span className="font-medium">Ad Soyad:</span>{" "}
              {buyer.fullName || "-"}
            </p>
            <p>
              <span className="font-medium">Telefon:</span>{" "}
              {buyer.gsm || "-"}
            </p>
            <p>
              <span className="font-medium">E-posta:</span>{" "}
              {buyer.email || "-"}
            </p>
          </div>
        </div>

        {/* ADRES */}
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <h2 className="font-semibold mb-2 text-gray-800">
            Teslimat Adresi
          </h2>
          <div className="text-sm space-y-1">
            <p>
              <span className="font-medium">Alıcı:</span>{" "}
              {addr.fullName || "-"}
            </p>
            <p>
              <span className="font-medium">İl / İlçe:</span>{" "}
              {addr.city} / {addr.district}
            </p>
            <p className="break-words">
              <span className="font-medium">Adres:</span> {addr.address}
            </p>
            <p>
              <span className="font-medium">Posta Kodu:</span>{" "}
              {addr.postalCode}
            </p>
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
                    <td className="px-3 py-2">
                      {it.sellerProductCode || "-"}
                    </td>
                    <td className="px-3 py-2 text-right">{q}</td>
                    <td className="px-3 py-2 text-right">
                      {unitPrice.toFixed(2)} ₺
                    </td>
                    <td className="px-3 py-2 text-right">
                      {total.toFixed(2)} ₺
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* İŞLEMLER + RAW JSON */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* İŞLEMLER */}
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <h2 className="font-semibold mb-3 text-gray-800">İşlemler</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowShipmentModal(true)}
              className="px-3 py-2 text-sm rounded-md bg-orange-500 text-white hover:bg-orange-600"
            >
              📦 Kargoya Ver
            </button>

            <button
              onClick={openCariModal}
              className="px-3 py-2 text-sm rounded-md bg-blue-500 text-white hover:bg-blue-600"
            >
              🔗 Cari ile Eşleştir
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

      {/* 📦 KARGO MODAL */}
      {showShipmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-[400px]">
            <h2 className="text-xl font-bold mb-4 text-orange-600">
              📦 Kargoya Ver
            </h2>

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
                disabled={isSendingShipment}
                onClick={sendShipment}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg"
              >
                {isSendingShipment ? "Gönderiliyor..." : "Gönder"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔗 CARİ MODAL */}
      {showCariModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-[520px] max-h-[80vh] overflow-auto">
            <h2 className="text-xl font-bold mb-4 text-blue-600">
              🔗 Cari ile Eşleştir
            </h2>

            <div className="mb-3 text-sm bg-gray-50 border rounded p-3">
              <p className="font-semibold mb-1">N11 Müşteri Bilgisi</p>
              <p>Ad Soyad: {buyer.fullName || "-"}</p>
              <p>Telefon: {buyer.gsm || "-"}</p>
              <p>E-posta: {buyer.email || "-"}</p>
            </div>

            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-700">
                Aşağıda ERP&apos;de bulunan olası cari kayıtları listelenir.
              </p>
              <button
                onClick={searchCari}
                className="text-xs px-3 py-1 rounded-md border bg-gray-50 hover:bg-gray-100"
              >
                {cariLoading ? "Yenileniyor..." : "Tekrar Ara"}
              </button>
            </div>

            <div className="border rounded-md max-h-56 overflow-auto mb-4">
              {cariLoading && (
                <p className="text-sm text-center py-3 text-gray-500">
                  Aranıyor...
                </p>
              )}

              {!cariLoading && cariResults.length === 0 && (
                <p className="text-sm text-center py-3 text-gray-500">
                  Eşleşen cari bulunamadı. (İleride &quot;Yeni Cari
                  Oluştur&quot; eklenecek)
                </p>
              )}

              {!cariLoading &&
                cariResults.map((c) => (
                  <label
                    key={c._id}
                    className="flex items-start gap-2 px-3 py-2 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 text-sm"
                  >
                    <input
                      type="radio"
                      name="cari"
                      className="mt-1"
                      checked={selectedCariId === c._id}
                      onChange={() => setSelectedCariId(c._id)}
                    />
                    <div>
                      <p className="font-semibold">
                        {c.ad}{" "}
                        {c.score > 0 && (
                          <span className="text-xs text-green-700 ml-1">
                            (puan: {c.score})
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-600">
                        Tel: {c.telefon || "-"} | E-posta: {c.email || "-"}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {c.il || "-"} / {c.ilce || "-"}
                      </p>
                    </div>
                  </label>
                ))}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCariModal(false)}
                className="px-4 py-2 border rounded-lg text-sm"
              >
                Kapat
              </button>
              <button
                disabled={cariLoading}
                onClick={linkOrderToCari}
                className="px-4 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700"
              >
                {cariLoading ? "Kaydediliyor..." : "Seçilen Cari ile Bağla"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
