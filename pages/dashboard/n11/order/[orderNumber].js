// 📁 /pages/dashboard/n11/order/[orderNumber].js

import React, { useMemo, useState, useEffect } from "react";
import dbConnect from "@/lib/mongodb";
import N11Order from "@/models/N11Order";
import Cari from "@/models/Cari";
import { n11StatusMap } from "@/utils/n11StatusMap";
import { ShippingLabelModal } from "@/components/n11/ShippingLabelModal";

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
    _id: c._id?.toString() || null,
    ad: c.ad ?? null,
    telefon: c.telefon ?? null,
    email: c.email ?? null,
  };
}

    }

    // ✅ JSON SERIALIZE FIX (ObjectId/string/date düzeltmeleri)
    const order = {
      ...doc,
      _id: doc._id ? doc._id.toString() : null,

      accountId: doc.accountId ? doc.accountId.toString() : null,
      cariId: doc.cariId ? doc.cariId.toString() : null,
      companyId: doc.companyId ? doc.companyId.toString() : null,
      createdBy: doc.createdBy ? doc.createdBy.toString() : null,
      userId: doc.userId ? doc.userId.toString() : null,

      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
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
  const raw = order.raw || {};
  const buyer = order.buyer || {};
  const addr = order.shippingAddress || {};

  // ✅ buyerName fix (RAW fallback)
  const buyerName =
    buyer.fullName ||
    buyer.name ||
    raw.customerfullName ||
    raw.customerFullName ||
    addr.fullName ||
    raw.shippingAddress?.fullName ||
    raw.billingAddress?.fullName ||
    "-";

  const buyerPhone =
    buyer.gsm ||
    buyer.phone ||
    addr.gsm ||
    raw.shippingAddress?.gsm ||
    raw.billingAddress?.gsm ||
    "-";

  const buyerEmail = buyer.email || raw.customerEmail || "-";

  const fullAddress =
    addr.address ||
    addr.fullAddress?.address ||
    raw.shippingAddress?.address ||
    raw.billingAddress?.address ||
    "-";

  const city =
    addr.city || raw.shippingAddress?.city || raw.billingAddress?.city || "-";

  const district =
    addr.district ||
    addr.fullAddress?.district ||
    raw.shippingAddress?.district ||
    raw.billingAddress?.district ||
    "-";

  // ✅ Ürünler: order.items boşsa raw.lines fallback
  const items = useMemo(() => {
    const localItems = Array.isArray(order.items) ? order.items : [];
    if (localItems.length > 0) return localItems;

    // REST format
    const lines = raw?.lines;
    if (!lines) return [];

    const arr = Array.isArray(lines) ? lines : [lines];
    return arr.map((l) => ({
      productName: l.productName,
      stockCode: l.stockCode,
      quantity: Number(l.quantity || 1),
      price: Number(l.price || 0),
    }));
  }, [order.items, raw]);

  const totalPrice =
    order.totalPrice != null
      ? Number(order.totalPrice)
      : raw.totalAmount != null
      ? Number(raw.totalAmount)
      : 0;

  // Kargo alanları (REST)
  const shipmentCompanyName = raw?.cargoProviderName || raw?.cargoProvider || "";
  const trackingNumber =
    raw?.cargoTrackingNumber || raw?.cargoSenderNumber || "";

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

  // ✅ ERP PUSH STATES
const [erpLoading, setErpLoading] = useState(false);
const [erpMessage, setErpMessage] = useState("");

  // 📄 Kargo etiketi modal + gönderici bilgisi
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [labelSender, setLabelSender] = useState({});

  // 🧾 RAW JSON Toggle (default gizli)
  const [showRaw, setShowRaw] = useState(false);

  // Gönderici bilgisini firma ayarlarından al (etiket için)
  useEffect(() => {
    if (!showLabelModal) return;
    const token = getToken();
    if (!token) return;
    fetch("/api/company/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.company) {
          setLabelSender({
            companyName: data.company.firmaAdi || "",
            phone: data.company.telefon || data.company.eposta || "",
            address: data.company.adres || "",
          });
        }
      })
      .catch(() => {});
  }, [showLabelModal]);



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

  // ✅ TOKEN FIX: token tanımlı değil hatası buradan geliyordu
  const getToken = () => {
  if (typeof window === "undefined") return null;

  const t1 = localStorage.getItem("token");
  if (t1) return t1;

  const match = document.cookie.match(/(^| )token=([^;]+)/);
  return match ? match[2] : null;
};


  // 🔍 Cari arama (RAW fallback ile)
  const searchCari = async () => {
    setCariLoading(true);
    try {
      const token = getToken();

      const res = await fetch("/api/cari/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          email: buyer.email || raw.customerEmail || "",
          phone: buyer.gsm || addr.gsm || raw.shippingAddress?.gsm || "",
          fullName: buyer.fullName || raw.customerfullName || buyerName || "",
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

  const linkOrderToCari = async () => {
    setCariLoading(true);
    try {

      if (!selectedCariId) {
  alert("Lütfen bir cari seçin");
  return;
}
      const token = localStorage.getItem("token");

const res = await fetch("/api/cari/link-order", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
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

  const pushToERP = async () => {
  try {
    setErpLoading(true);
    setErpMessage("");

    const token = getToken();
    if (!token) {
      setErpMessage("❌ Token bulunamadı. Lütfen tekrar giriş yap.");
      return;
    }

    const res = await fetch("/api/n11/orders/create-erp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        orderId: raw?.id || raw?.orderId || order?.orderId || undefined,
        orderNumber: order?.orderNumber || raw?.orderNumber,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      setErpMessage(`❌ ERP Aktarım Hatası: ${data.message || data.error || "Bilinmeyen hata"}`);
      return;
    }

    const saleNoText = data.saleNo ? `SaleNo: ${data.saleNo}` : "";
    const txText = data.transactionId ? `TransactionId: ${data.transactionId}` : "";

    setErpMessage(`✅ ERP’ye aktarıldı! ${saleNoText} ${txText}`);
  } catch (err) {
    setErpMessage(`❌ ERP Aktarım Hatası: ${err?.message || String(err)}`);
  } finally {
    setErpLoading(false);
  }
};

  // Durum rengi
  const statusText =
    n11StatusMap[order.status] || n11StatusMap[raw.status] || order.status || "-";

  const statusColor =
    String(statusText).toLowerCase().includes("iptal")
      ? "bg-red-100 text-red-700"
      : String(statusText).toLowerCase().includes("kargo")
      ? "bg-blue-100 text-blue-700"
      : "bg-gray-100 text-gray-700";

  return (
    <div className="p-4 md:p-6">
      {/* Üst başlık */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-orange-600">N11 Sipariş Detayı</h1>
          <p className="text-sm text-gray-500">
            Sipariş No: <span className="font-semibold">{order.orderNumber}</span>
          </p>

          {hasLinkedCari && (
            <p className="text-xs text-green-700 mt-1">
              🔗 Bağlı Cari: <span className="font-semibold">{currentCari?.ad || "-"}</span>

              ({currentCari.telefon || currentCari.email || "-"})
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

      {/* Bilgi Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <h2 className="font-semibold mb-2 text-gray-800">Sipariş Özeti</h2>
          <div className="text-sm space-y-1">
            <p>
              <span className="font-medium">Durum:</span>{" "}
              <span className={`inline-flex px-2 py-1 rounded-full text-xs ${statusColor}`}>
                {statusText}
              </span>
            </p>
            <p>
              <span className="font-medium">Toplam Tutar:</span>{" "}
              {totalPrice ? `${totalPrice.toFixed(2)} ₺` : "-"}
            </p>
            <p>
              <span className="font-medium">Kargo:</span> {shipmentCompanyName || "-"}
            </p>
            <p>
              <span className="font-medium">Takip No:</span> {trackingNumber || "-"}
            </p>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <h2 className="font-semibold mb-2 text-gray-800">Müşteri Bilgileri</h2>
          <div className="text-sm space-y-1">
            <p>
              <span className="font-medium">Ad Soyad:</span> {buyerName}
            </p>
            <p>
              <span className="font-medium">Telefon:</span> {buyerPhone}
            </p>
            <p>
              <span className="font-medium">E-posta:</span> {buyerEmail}
            </p>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <h2 className="font-semibold mb-2 text-gray-800">Teslimat Adresi</h2>
          <div className="text-sm space-y-1">
            <p>
              <span className="font-medium">İl / İlçe:</span> {city} / {district}
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

      {/* Ürünler */}
      <div className="bg-white border rounded-lg p-4 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800">Sipariş Ürünleri</h2>
          <span className="text-xs text-gray-500">{items.length} ürün</span>
        </div>

        {items.length === 0 ? (
          <div className="text-sm text-gray-500 border rounded-md p-3 bg-gray-50">
            Bu siparişte ürün bulunamadı. (N11 response içindeki alan adı farklı olabilir)
          </div>
        ) : (
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
                      <td className="px-3 py-2">{it.productName || "-"}</td>
                      <td className="px-3 py-2">{it.stockCode || it.sellerProductCode || "-"}</td>
                      <td className="px-3 py-2 text-right">{q}</td>
                      <td className="px-3 py-2 text-right">{unitPrice.toFixed(2)} ₺</td>
                      <td className="px-3 py-2 text-right">{total.toFixed(2)} ₺</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* İşlemler */}
      <div className="bg-white border rounded-lg p-4 shadow-sm mb-6">
        <h2 className="font-semibold mb-3 text-gray-800">İşlemler</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowShipmentModal(true)}
            className="px-3 py-2 text-sm rounded-md bg-orange-500 text-white hover:bg-orange-600"
          >
            📦 Kargoya Ver (Manuel)
          </button>

          <button
            onClick={() => setShowLabelModal(true)}
            className="px-3 py-2 text-sm rounded-md bg-pink-500 text-white hover:bg-pink-600"
          >
            🏷️ Kargo Etiketi (Çıktı Al)
          </button>

          <button
            onClick={openCariModal}
            className="px-3 py-2 text-sm rounded-md bg-blue-500 text-white hover:bg-blue-600"
          >
            🔗 Cari ile Eşleştir
          </button>

          <button
  onClick={pushToERP}
  disabled={erpLoading}
  className="px-3 py-2 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
>
  {erpLoading ? "ERP’ye Aktarılıyor..." : "✅ ERP’ye Aktar"}
</button>

{erpMessage && (
  <div className="mt-3 text-sm p-3 rounded-md border bg-gray-50">
    {erpMessage}
  </div>
)}


          <button
            onClick={() => setShowRaw((s) => !s)}
            className="px-3 py-2 text-sm rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200 border"
          >
            🧾 Teknik JSON {showRaw ? "Gizle" : "Göster"}
          </button>
        </div>

        {showRaw && (
          <div className="mt-4">
            <div className="text-xs text-gray-500 mb-2">
              Bu alan sadece geliştirme amaçlıdır (N11 ham response).
            </div>
            <pre className="text-[11px] max-h-72 overflow-auto bg-gray-50 border rounded-md p-3">
              {JSON.stringify(raw, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* 📄 N11 tarzı kargo etiketi modal */}
      <ShippingLabelModal
        open={showLabelModal}
        onClose={() => setShowLabelModal(false)}
        sender={labelSender}
        recipient={{
          name: buyerName,
          address: fullAddress,
          district,
          city,
          postalCode: addr.postalCode || raw.shippingAddress?.postalCode || raw.deliveryAddress?.postalCode || "",
          phone: buyerPhone,
        }}
        orderNumber={order.orderNumber || raw.orderNumber || ""}
        cargoCompany={shipmentCompanyName}
        paymentType={raw.paymentType || raw.shipmentPriceType || "Mağaza Öder"}
        items={items}
        campaignCode={trackingNumber || raw.cargoSenderNumber || raw.campaignCode || ""}
      />

      {/* 📦 MANUEL KARGO MODAL */}
      {showShipmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-[400px]">
            <h2 className="text-xl font-bold mb-4 text-orange-600">📦 Kargoya Ver (Manuel)</h2>

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
            <h2 className="text-xl font-bold mb-4 text-blue-600">🔗 Cari ile Eşleştir</h2>

            <div className="mb-3 text-sm bg-gray-50 border rounded p-3">
              <p className="font-semibold mb-1">N11 Müşteri Bilgisi</p>
              <p>Ad Soyad: {buyerName}</p>
              <p>Telefon: {buyerPhone}</p>
              <p>E-posta: {buyerEmail}</p>
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
                <p className="text-sm text-center py-3 text-gray-500">Aranıyor...</p>
              )}

              {!cariLoading && cariResults.length === 0 && (
                <p className="text-sm text-center py-3 text-gray-500">
                  Eşleşen cari bulunamadı. Cari seçmeden kaydederseniz backend otomatik yeni
                  cari oluşturur.
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
                          <span className="text-xs text-green-700 ml-1">(puan: {c.score})</span>
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
    </div>
  );
}
