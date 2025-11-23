// 📁 /pages/api/n11/orders/index.js
import axios from "axios";
import xml2js from "xml2js";
import dbConnect from "@/lib/mongodb";
import N11Order from "@/models/N11Order";
import Cari from "@/models/Cari";

// 🔧 Sipariş içindeki ürünleri normalize eden yardımcı fonksiyon
function extractItemsFromOrder(o = {}) {
  const list =
    o.itemList ||
    o.items ||
    o.orderItemList ||
    o.orderItemListResponse ||
    {};

  let rawItems =
    list.item || list.items || list.orderItem || list.orderItems || [];

  if (Array.isArray(rawItems)) return rawItems;
  if (rawItems) return [rawItems];
  return [];
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Only GET supported" });
  }

  const appKey = process.env.N11_APP_KEY;
  const appSecret = process.env.N11_APP_SECRET;

  if (!appKey || !appSecret) {
    return res.status(500).json({
      success: false,
      message: "N11_APP_KEY veya N11_APP_SECRET eksik",
    });
  }

  try {
    await dbConnect();

    const xmlBody = `<?xml version="1.0" encoding="utf-8"?>
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
            <pageSize>50</pageSize>
          </pagingData>
        </sch:DetailedOrderListRequest>
      </soapenv:Body>
    </soapenv:Envelope>`;

    // 🔄 API çağrısı
    const { data } = await axios.post(
      "https://api.n11.com/ws/OrderService",
      xmlBody,
      { headers: { "Content-Type": "text/xml;charset=UTF-8" }, timeout: 20000 }
    );

    const parser = new xml2js.Parser({ explicitArray: false });
    const parsed = await parser.parseStringPromise(data);

    // 🧩 XML parsing
    const envelope =
      parsed["SOAP-ENV:Envelope"] ||
      parsed["soapenv:Envelope"] ||
      parsed.Envelope;

    const body =
      envelope?.["SOAP-ENV:Body"] ||
      envelope?.["soapenv:Body"] ||
      envelope?.Body;

    const responseNode =
      body?.["ns3:DetailedOrderListResponse"] ||
      body?.["ns2:DetailedOrderListResponse"] ||
      body?.["ns1:DetailedOrderListResponse"] ||
      body?.DetailedOrderListResponse;

    const ordersRaw = responseNode?.orderList?.order || [];
    const orders = Array.isArray(ordersRaw) ? ordersRaw : [ordersRaw];

    // ========================================================================
    // 🚀 AŞAMA 2 — OTOMATİK CARİ OLUŞTURMA & EŞLEŞTİRME
    // ========================================================================
    for (const o of orders) {
      const buyer = o.buyer || {};
      const addr = o.shippingAddress || {};
      const items = extractItemsFromOrder(o);

      // 🔍 1) CARİ ARA
      let cari = await Cari.findOne({
        $or: [
          { n11CustomerId: buyer.id },
          { email: buyer.email },
          { ad: buyer.fullName }
        ]
      });

      // 🆕 2) CARİ BULUNAMADI → OTOMATİK OLUŞTUR
      if (!cari) {
        cari = await Cari.create({
          ad: buyer.fullName || "N11 Müşteri",
          tur: "Müşteri",

          n11CustomerId: buyer.id || "",
          email: buyer.email || "",
          telefon: addr.gsm || addr.phone || "",

          vergiTipi: "TCKN",
          vergiNo: buyer.tcId || "",
          vergiDairesi: "",

          adres: addr.address || "",
          il: addr.city || "",
          ilce: addr.district || "",
          postaKodu: addr.postalCode || "",

          paraBirimi: "TRY",

          userId: null, // Çoklu kullanıcı varsa sende değiştiririz
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        console.log("🆕 Yeni cari oluşturuldu:", cari.ad);
      }

      // 📌 Siparişi kaydet + cariId ekle
      const totalPrice =
        Number(o.totalAmount?.value ?? 0) ||
        Number(o.amount?.value ?? 0) ||
        0;

      await N11Order.findOneAndUpdate(
        { orderNumber: o.orderNumber },
        {
          orderNumber: o.orderNumber,
          buyer: o.buyer || {},
          shippingAddress: addr,
          items,
          totalPrice,
          status: o.status,
          accountId: cari._id,  // 🔥 CARİ BAĞLANDI
          raw: o,
        },
        { upsert: true, new: true }
      );
    }

    return res.status(200).json({
      success: true,
      message: "Siparişler + cari eşleştirme başarılı",
      count: orders.length,
    });
  } catch (error) {
    console.error("❌ N11 OrderService hata:", error.message);
    return res.status(500).json({
      success: false,
      message: "Sipariş çekme hatası",
      error: error.message,
    });
  }
}
