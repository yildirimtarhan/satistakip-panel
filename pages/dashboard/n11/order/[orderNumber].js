// 📁 /pages/dashboard/n11/order/[orderNumber].js

import React, { useState } from "react";
import dbConnect from "@/lib/mongodb";
import N11Order from "@/models/N11Order";
import Cari from "@/models/Cari";


export async function getServerSideProps(context) {
  const { orderNumber } = context.params;

  try {
    await dbConnect();

    let doc = await N11Order.findOne({ orderNumber }).lean();
    let fromLive = false;

    // Eğer sipariş DB'de yoksa, N11 API'den canlı çekelim
    if (!doc) {
      const appKey = process.env.N11_APP_KEY;
      const appSecret = process.env.N11_APP_SECRET;

      if (!appKey || !appSecret) {
        console.error("❌ N11 API KEY/SECRET eksik!");
        return { notFound: true };
      }

      // -----------------------------
      // N11 SOAP REQUEST • DetailedOrderListRequest
      // -----------------------------
      const xml = `<?xml version="1.0" encoding="utf-8"?>
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
        xmlns:sch="http://www.n11.com/ws/schemas">
        <soapenv:Header/>
        <soapenv:Body>
          <sch:DetailedOrderListRequest>
            <auth>
              <appKey>${appKey}</appKey>
              <appSecret>${appSecret}</appSecret>
            </auth>
            <pagingData>
              <currentPage>0</currentPage>
              <pageSize>10</pageSize>
            </pagingData>
            <searchData>
              <orderNumber>${orderNumber}</orderNumber>
            </searchData>
          </sch:DetailedOrderListRequest>
        </soapenv:Body>
      </soapenv:Envelope>`;

      const axiosModule = await import("axios");
      const { default: axios } = axiosModule;
      const xml2js = await import("xml2js");
      const parser = new xml2js.Parser({ explicitArray: false });

      const { data } = await axios.post(
        "https://api.n11.com/ws/OrderService",
        xml,
        {
          headers: {
            "Content-Type": "text/xml;charset=UTF-8",
          },
          timeout: 20000,
        }
      );

      const parsed = await parser.parseStringPromise(data);

      const envelope =
        parsed?.["SOAP-ENV:Envelope"] ||
        parsed?.["soapenv:Envelope"] ||
        parsed?.Envelope;

      const body =
        envelope?.["SOAP-ENV:Body"] ||
        envelope?.["soapenv:Body"] ||
        envelope?.Body;

      const resp =
        body?.["ns3:DetailedOrderListResponse"] ||
        body?.DetailedOrderListResponse ||
        body?.["sch:DetailedOrderListResponse"];

      let orderList = resp?.orderList?.order;

      if (!orderList) {
        return { notFound: true };
      }

      if (Array.isArray(orderList)) {
        orderList =
          orderList.find((o) => o.orderNumber == orderNumber) || orderList[0];
      }

      const rawOrder = orderList;

      // -----------------------------
      // ITEMS normalize
      // -----------------------------
      const rawItems =
        rawOrder?.orderItemList?.orderItem ||
        rawOrder?.itemList?.item ||
        rawOrder?.items?.item ||
        [];

      const itemsArray = Array.isArray(rawItems)
        ? rawItems
        : rawItems
        ? [rawItems]
        : [];

      const items = itemsArray.map((it) => ({
        id: it.id,
        productId: it.productId,
        productName: it.productName || it.title || "N11 Ürünü",
        quantity: Number(it.quantity || 1),
        price: Number(it.price || 0),
        totalMallDiscountPrice: Number(
          it.totalMallDiscountPrice || it.mallDiscount || 0
        ),
        sellerInvoiceAmount: Number(it.sellerInvoiceAmount || 0),
        productSellerCode: it.productSellerCode,
        status: it.status,
        shipmentInfo: it.shipmentInfo || {},
        rawItem: it,
      }));

      // -----------------------------
      // ERP kayıt formatı
      // -----------------------------
      const docToSave = {
        orderNumber: rawOrder.orderNumber,
        buyer: {
          fullName:
            rawOrder.recipient ||
            rawOrder.buyerName ||
            rawOrder.buyer?.fullName ||
            "",
          email: rawOrder.buyer?.email || "",
          gsm: rawOrder.buyer?.gsm || "",
        },
        shippingAddress:
          rawOrder.shippingAddress ||
          rawOrder.deliveryAddress ||
          rawOrder.billingAddress ||
          {},
        items,
        totalPrice: Number(rawOrder.totalAmount || 0),
        status: rawOrder.status,
        raw: rawOrder,
      };

      // -----------------------------
      // DB'ye upsert
      // -----------------------------
      const saved = await N11Order.findOneAndUpdate(
        { orderNumber: docToSave.orderNumber },
        { $set: docToSave },
        { new: true, upsert: true }
      ).lean();

      doc = saved || docToSave;
      fromLive = true;
    }

    // -----------------------------
    // Cari bağlanmış mı?
    // -----------------------------
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
      _id: doc._id ? doc._id.toString() : null,
      accountId: doc.accountId ? doc.accountId.toString() : null,
      createdAt: doc.createdAt ? doc.createdAt.toISOString() : null,
      updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null,
      fromLive,
    };

    return {
      props: {
        order,
        linkedCari: linkedCari || null,
      },
    };
  } catch (err) {
    console.error("❌ getServerSideProps ERR:", err);
    return { notFound: true };
  }
}

export default function N11OrderDetailPage({ order, linkedCari }) {
  const buyer = order.buyer || {};
  const addr = order.shippingAddress || {};
  const items = order.items || [];
  const raw = order.raw || {};

  // 🔹 N11 shipmentInfo (otomatik kargo verisi)
  const shipmentInfo =
    raw?.orderItemList?.orderItem?.shipmentInfo ||
    raw?.orderItemList?.orderItem?.shipmentInfo ||
    {};
  const shipmentCompanyName = shipmentInfo?.shipmentCompany?.name || "";
  const shipmentCode = shipmentInfo?.shipmentCode || "";
  const trackingNumber = shipmentInfo?.trackingNumber || "";
  const campaignNumber = shipmentInfo?.campaignNumber || "";
  const barcodeUrl = shipmentCode
    ? `https://img.n11.com.tr/OrderShipment/Barcode/${shipmentCode}.png`
    : "";

  const firstItem = items[0] || raw?.orderItemList?.orderItem || {};
  const quantity =
    Number(firstItem.quantity || firstItem.amount || 1) || 1;
  const productName =
    firstItem.productName ||
    firstItem.title ||
    "N11 Ürünü";

  const buyerName = buyer.fullName || buyer.name || addr.fullName || "-";
  const buyerPhone = buyer.gsm || addr.gsm || buyer.phone || "-";
  const fullAddress =
    addr.address ||
    addr.fullAddress?.address ||
    raw.billingAddress?.address ||
    "-";
  const city = addr.city || raw.billingAddress?.city || "";
  const district =
    addr.district ||
    addr.fullAddress?.district ||
    raw.billingAddress?.district ||
    "";

  // 📦 MANUEL KARGO POPUP STATES
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [shipmentCompany, setShipmentCompany] = useState("");
  const [trackingInputNumber, setTrackingInputNumber] = useState("");
  const [isSendingShipment, setIsSendingShipment] = useState(false);

  // 🔗 CARİ POPUP STATES
  const [showCariModal, setShowCariModal] = useState(false);
  const [cariLoading, setCariLoading] = useState(false);
  const [cariResults, setCariResults] = useState([]);
  const [selectedCariId, setSelectedCariId] = useState("");
  const [currentCari, setCurrentCari] = useState(linkedCari);
  const hasLinkedCari = !!currentCari;

  // 🧾 BARKOD MODAL STATES
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [barcodeTab, setBarcodeTab] = useState("standard"); // "standard" | "advanced"

  const sendShipment = async () => {
    if (!shipmentCompany || !trackingInputNumber) {
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
          trackingNumber: trackingInputNumber,
        }),
      });

      const data = await res.json();
      alert(data.message || "İşlem tamamlandı!");

      setShowShipmentModal(false);
      setShipmentCompany("");
      setTrackingInputNumber("");
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

  // 🔗 Siparişi cariye bağla (cariId yoksa backend otomatik yeni cari oluşturabilir)
  const linkOrderToCari = async () => {
    setCariLoading(true);
    try {
      const res = await fetch("/api/cari/link-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: order.orderNumber,
          cariId: selectedCariId || undefined,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        alert(data.message || "Eşleştirme başarısız");
      } else {
        alert(data.message || "Cari ile eşleştirildi");
        if (data.cari) {
          setCurrentCari(data.cari);
        }
        setShowCariModal(false);
      }
    } catch (err) {
      console.error("Cari eşleştirme hatası:", err);
      alert("Cari eşleştirme sırasında hata oluştu");
    }
    setCariLoading(false);
  };

  // 🖨 Yazdır fonksiyonu (yeni pencere aç + print)
  const printHtml = (html) => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>N11 Kargo Etiketi</title>
          <meta charSet="utf-8" />
          <style>
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 16px; }
            .label-card { border: 1px solid #ddd; border-radius: 12px; padding: 16px; max-width: 650px; margin: 0 auto; }
            .title { font-size: 18px; font-weight: 600; margin-bottom: 12px; }
            .row { font-size: 12px; margin-bottom: 4px; }
            .section-title { margin-top: 8px; margin-bottom: 4px; font-size: 13px; font-weight: 600; }
            .barcode { margin-top: 12px; max-width: 100%; height: auto; }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  const standardLabelHtml = `
    <div class="label-card">
      <div class="title">N11 Kargo Barkodu</div>
      <div class="row"><b>Sipariş No:</b> ${order.orderNumber || "-"}</div>
      <div class="row"><b>Kargo Firması:</b> ${shipmentCompanyName || "-"}</div>
      <div class="row"><b>Takip No:</b> ${trackingNumber || "-"}</div>
      <div class="row"><b>Barkod No:</b> ${shipmentCode || "-"}</div>
      ${
        barcodeUrl
          ? `<img class="barcode" src="${barcodeUrl}" alt="N11 Barkod" />`
          : ""
      }
    </div>
  `;

  const advancedLabelHtml = `
    <div class="label-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div class="title">N11 Kargo Etiketi (Detaylı)</div>
        <!-- LOGO ALANI (ileride /public/logo.png ile doldurulabilir) -->
        <div style="width:80px;height:40px;border:1px dashed #ccc;border-radius:8px;font-size:9px;display:flex;align-items:center;justify-content:center;color:#999;">
          LOGO
        </div>
      </div>

      <div class="section-title">Ürün</div>
      <div class="row"><b>Ürün Adı:</b> ${productName}</div>
      <div class="row"><b>Miktar:</b> ${quantity}</div>

      <div class="section-title">Müşteri</div>
      <div class="row"><b>Ad Soyad:</b> ${buyerName}</div>
      <div class="row"><b>Telefon:</b> ${buyerPhone}</div>
      <div class="row"><b>Adres:</b> ${fullAddress} ${district ? " - " + district : ""} ${city ? " / " + city : ""}</div>

      <div class="section-title">Sipariş / Kargo</div>
      <div class="row"><b>Sipariş No:</b> ${order.orderNumber || "-"}</div>
      <div class="row"><b>Kargo Firması:</b> ${shipmentCompanyName || "-"}</div>
      <div class="row"><b>Takip No:</b> ${trackingNumber || "-"}</div>
      <div class="row"><b>Barkod No:</b> ${shipmentCode || "-"}</div>
      ${
        campaignNumber
          ? `<div class="row"><b>Kampanya No:</b> ${campaignNumber}</div>`
          : ""
      }

      ${
        barcodeUrl
          ? `<img class="barcode" src="${barcodeUrl}" alt="N11 Barkod" />`
          : ""
      }
    </div>
  `;

  let trackingUrl = "";
  if (
    shipmentCompanyName &&
    shipmentCompanyName.toLowerCase().includes("yurtiçi") &&
    trackingNumber
  ) {
    trackingUrl = `https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=${trackingNumber}`;
  }

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

      {/* Üst bilgi kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Sipariş Özeti */}
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
                : raw.totalAmount
                ? `${raw.totalAmount} ₺`
                : "-"}
            </p>
          </div>
        </div>

        {/* Müşteri Bilgileri */}
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <h2 className="font-semibold mb-2 text-gray-800">
            Müşteri Bilgileri
          </h2>
          <div className="text-sm space-y-1">
            <p>
              <span className="font-medium">Ad Soyad:</span>{" "}
              {buyerName || "-"}
            </p>
            <p>
              <span className="font-medium">Telefon:</span>{" "}
              {buyerPhone || "-"}
            </p>
            <p>
              <span className="font-medium">E-posta:</span>{" "}
              {buyer.email || "-"}
            </p>
          </div>
        </div>

        {/* Teslimat Adresi */}
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <h2 className="font-semibold mb-2 text-gray-800">
            Teslimat Adresi
          </h2>
          <div className="text-sm space-y-1">
            <p>
              <span className="font-medium">Alıcı:</span> {buyerName}
            </p>
            <p>
              <span className="font-medium">İl / İlçe:</span> {city} /{" "}
              {district}
            </p>
            <p className="break-words">
              <span className="font-medium">Adres:</span> {fullAddress}
            </p>
            <p>
              <span className="font-medium">Posta Kodu:</span>{" "}
              {addr.postalCode || raw.billingAddress?.postalCode || "-"}
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
                    <td className="px-3 py-2">
                      {it.productName || it.title || "-"}
                    </td>
                    <td className="px-3 py-2">
                      {it.sellerProductCode || it.stockCode || "-"}
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

      {/* 🔶 OTOMATİK N11 KARGO KARTI */}
      {barcodeUrl && (
        <div className="bg-white border rounded-lg p-4 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="font-semibold mb-1 text-gray-800">
                📦 N11 Otomatik Kargo Bilgisi
              </h2>
              <div className="text-sm space-y-1">
                <p>
                  <span className="font-medium">Kargo Firması:</span>{" "}
                  {shipmentCompanyName || "-"}
                </p>
                <p>
                  <span className="font-medium">Takip No:</span>{" "}
                  {trackingNumber || "-"}
                </p>
                <p>
                  <span className="font-medium">Barkod No:</span>{" "}
                  {shipmentCode || "-"}
                </p>
                {campaignNumber && (
                  <p>
                    <span className="font-medium">Kampanya No:</span>{" "}
                    {campaignNumber}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="border rounded-md bg-white p-2 shadow-sm max-w-[200px]">
                {/* Küçük barkod önizleme */}
                <img
                  src={barcodeUrl}
                  alt="N11 Barkod"
                  className="max-h-24 w-full object-contain"
                />
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => {
                    setBarcodeTab("standard");
                    setShowBarcodeModal(true);
                  }}
                  className="px-3 py-1.5 text-xs rounded-md bg-orange-500 text-white hover:bg-orange-600"
                >
                  🔍 Barkodu Görüntüle
                </button>
                {trackingUrl && (
                  <a
                    href={trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 text-xs rounded-md bg-blue-500 text-white hover:bg-blue-600"
                  >
                    🚚 Kargo Takip
                  </a>
                )}
                <a
                  href={barcodeUrl}
                  download={`n11-barkod-${shipmentCode || order.orderNumber}.png`}
                  className="px-3 py-1.5 text-xs rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200 border"
                >
                  ⬇ PNG İndir
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* İŞLEMLER + RAW JSON */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* İŞLEMLER */}
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <h2 className="font-semibold mb-3 text-gray-800">İşlemler</h2>
          <div className="flex flex-wrap gap-2">
            {/* Manuel kargo popup (kalsın) */}
            <button
              onClick={() => setShowShipmentModal(true)}
              className="px-3 py-2 text-sm rounded-md bg-orange-500 text-white hover:bg-orange-600"
            >
              📦 Kargoya Ver (Manuel)
            </button>

            {/* Cari eşleştirme */}
            <button
              onClick={openCariModal}
              className="px-3 py-2 text-sm rounded-md bg-blue-500 text-white hover:bg-blue-600"
            >
              🔗 Cari ile Eşleştir
            </button>

            {/* Barkod modalını hızlı açmak için */}
            {barcodeUrl && (
              <button
                onClick={() => {
                  setBarcodeTab("advanced");
                  setShowBarcodeModal(true);
                }}
                className="px-3 py-2 text-sm rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200 border"
              >
                🖨 Barkod Etiketi (Detaylı)
              </button>
            )}
          </div>
        </div>

        {/* RAW JSON */}
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

      {/* 📦 MANUEL KARGO MODAL */}
      {showShipmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-[400px]">
            <h2 className="text-xl font-bold mb-4 text-orange-600">
              📦 Kargoya Ver (Manuel)
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
              value={trackingInputNumber}
              onChange={(e) => setTrackingInputNumber(e.target.value)}
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
              <p>Ad Soyad: {buyerName}</p>
              <p>Telefon: {buyerPhone}</p>
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
                  Eşleşen cari bulunamadı. Cari seçmeden kaydederseniz backend
                  otomatik yeni cari oluşturur.
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
                {cariLoading ? "Kaydediliyor..." : "Seçilen / Yeni Cari ile Bağla"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🧾 BARKOD MODALI (STANDART + GELİŞMİŞ) */}
      {showBarcodeModal && barcodeUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[90vw] max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-800">
                  📦 N11 Kargo Barkod Etiketi
                </h2>
                <span className="text-xs text-gray-500">
                  (Sipariş: {order.orderNumber})
                </span>
              </div>
              <button
                onClick={() => setShowBarcodeModal(false)}
                className="text-sm px-3 py-1 rounded-md border hover:bg-gray-100"
              >
                Kapat ✕
              </button>
            </div>

            {/* Sekmeler */}
            <div className="flex border-b text-sm">
              <button
                onClick={() => setBarcodeTab("standard")}
                className={`flex-1 px-4 py-2 ${
                  barcodeTab === "standard"
                    ? "border-b-2 border-orange-500 text-orange-600 font-semibold bg-orange-50"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                Standart Barkod
              </button>
              <button
                onClick={() => setBarcodeTab("advanced")}
                className={`flex-1 px-4 py-2 ${
                  barcodeTab === "advanced"
                    ? "border-b-2 border-blue-500 text-blue-600 font-semibold bg-blue-50"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                Detaylı Etiket
              </button>
            </div>

            {/* İçerik */}
            <div className="flex-1 overflow-auto p-4 bg-gray-50">
              {barcodeTab === "standard" && (
                <div className="bg-white rounded-xl shadow-sm p-4 max-w-xl mx-auto">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">
                    Standart Barkod Görünümü
                  </h3>
                  <p className="text-xs text-gray-500 mb-3">
                    N11 tarafından üretilen barkod. Depoda hızlı işlem için
                    kullanın.
                  </p>
                  <div className="text-xs space-y-1 mb-3">
                    <p>
                      <span className="font-medium">Kargo Firması:</span>{" "}
                      {shipmentCompanyName || "-"}
                    </p>
                    <p>
                      <span className="font-medium">Takip No:</span>{" "}
                      {trackingNumber || "-"}
                    </p>
                    <p>
                      <span className="font-medium">Barkod No:</span>{" "}
                      {shipmentCode || "-"}
                    </p>
                  </div>
                  <div className="border rounded-lg bg-white p-3 flex justify-center">
                    <img
                      src={barcodeUrl}
                      alt="N11 Barkod"
                      className="max-h-40 w-full object-contain"
                    />
                  </div>
                </div>
              )}

              {barcodeTab === "advanced" && (
                <div className="bg-white rounded-xl shadow-sm p-4 max-w-xl mx-auto">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">
                    Detaylı Kargo Etiketi (Ürün + Müşteri + Adres)
                  </h3>
                  <p className="text-xs text-gray-500 mb-3">
                    Bu şablon, depo için ürün ve müşteri detaylarını da içerir.
                  </p>
                  <div className="border rounded-lg p-3 text-xs space-y-2">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <p className="font-semibold text-sm">
                          N11 Kargo Etiketi
                        </p>
                        <p className="text-[11px] text-gray-500">
                          Sipariş No: {order.orderNumber}
                        </p>
                      </div>
                      <div className="w-20 h-10 border border-dashed border-gray-300 rounded-md flex items-center justify-center text-[9px] text-gray-400">
                        LOGO
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold text-[11px] mt-1 mb-1">
                        Ürün
                      </p>
                      <p>
                        <b>Ad:</b> {productName}
                      </p>
                      <p>
                        <b>Miktar:</b> {quantity}
                      </p>
                    </div>

                    <div>
                      <p className="font-semibold text-[11px] mt-1 mb-1">
                        Müşteri
                      </p>
                      <p>
                        <b>Ad Soyad:</b> {buyerName}
                      </p>
                      <p>
                        <b>Telefon:</b> {buyerPhone}
                      </p>
                      <p>
                        <b>Adres:</b> {fullAddress}{" "}
                        {district ? ` - ${district}` : ""}{" "}
                        {city ? ` / ${city}` : ""}
                      </p>
                    </div>

                    <div>
                      <p className="font-semibold text-[11px] mt-1 mb-1">
                        Sipariş / Kargo
                      </p>
                      <p>
                        <b>Kargo Firması:</b> {shipmentCompanyName || "-"}
                      </p>
                      <p>
                        <b>Takip No:</b> {trackingNumber || "-"}
                      </p>
                      <p>
                        <b>Barkod No:</b> {shipmentCode || "-"}
                      </p>
                      {campaignNumber && (
                        <p>
                          <b>Kampanya No:</b> {campaignNumber}
                        </p>
                      )}
                    </div>

                    <div className="border rounded-md bg-white p-2 flex justify-center mt-1">
                      <img
                        src={barcodeUrl}
                        alt="N11 Barkod"
                        className="max-h-40 w-full object-contain"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Alt butonlar */}
            <div className="border-t bg-white px-4 py-3 flex justify-between items-center text-xs">
              <div className="text-[11px] text-gray-500">
                Barkodu yazdırdığınızda tarayıcıdan &quot;PDF olarak
                kaydet&quot; seçeneğiyle PDF oluşturabilirsiniz.
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    printHtml(
                      barcodeTab === "standard"
                        ? standardLabelHtml
                        : advancedLabelHtml
                    )
                  }
                  className="px-3 py-1.5 rounded-md bg-orange-500 text-white hover:bg-orange-600"
                >
                  🖨 Yazdır / PDF
                </button>
                <a
                  href={barcodeUrl}
                  download={`n11-barkod-${shipmentCode || order.orderNumber}.png`}
                  className="px-3 py-1.5 rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200 border"
                >
                  ⬇ PNG İndir
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
