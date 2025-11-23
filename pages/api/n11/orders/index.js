// 📁 /pages/api/n11/orders/index.js
import axios from "axios";
import xml2js from "xml2js";
import dbConnect from "@/lib/mongodb";
import N11Order from "@/models/N11Order";

// 🔧 Sipariş içindeki ürünleri, N11'in farklı XML formatlarından normalize eden yardımcı fonksiyon
function extractItemsFromOrder(o = {}) {
  // N11 bazı siparişlerde itemList, bazılarında items, bazılarında orderItemList kullanabiliyor
  const list =
    o.itemList ||
    o.items ||
    o.orderItemList ||
    o.orderItemListResponse ||
    {};

  // Bazı XML'lerde item yerine items.item, orderItem vs. gelebiliyor
  let rawItems =
    list.item || list.items || list.orderItem || list.orderItems || [];

  if (Array.isArray(rawItems)) {
    return rawItems;
  }

  if (rawItems) {
    return [rawItems];
  }

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
      message: "N11_APP_KEY veya N11_APP_SECRET eksik (.env kontrol et)",
    });
  }

  // İsteğe bağlı: status, page, pageSize query parametreleri
  const { status = "1", page = "0", pageSize = "20" } = req.query;

  // 🌐 SOAP XML (DetailedOrderListRequest)
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
          <currentPage>${page}</currentPage>
          <pageSize>${pageSize}</pageSize>
        </pagingData>
        <searchData>
          <status>${status}</status>
        </searchData>
      </sch:DetailedOrderListRequest>
    </soapenv:Body>
  </soapenv:Envelope>`;

  try {
    await dbConnect();

    const { data } = await axios.post(
      "https://api.n11.com/ws/OrderService",
      xmlBody,
      {
        headers: { "Content-Type": "text/xml;charset=UTF-8" },
        timeout: 20000,
      }
    );

    const parser = new xml2js.Parser({ explicitArray: false });
    const parsed = await parser.parseStringPromise(data);

    // Farklı namespace ihtimallerini karşıla
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
    const orders = Array.isArray(ordersRaw)
      ? ordersRaw
      : [ordersRaw].filter(Boolean);

    // 🔄 MongoDB'ye kaydet (upsert + item normalize)
    for (const o of orders) {
      const items = extractItemsFromOrder(o);

      const totalPrice =
        Number(o.totalAmount?.value ?? 0) ||
        Number(o.amount?.value ?? 0) ||
        0;

      await N11Order.findOneAndUpdate(
        { orderNumber: o.orderNumber },
        {
          orderNumber: o.orderNumber,
          buyer: o.buyer || {},
          shippingAddress: o.shippingAddress || o.shippingAddressDetail || {},
          items,
          totalPrice,
          status: o.status,
          raw: o,
        },
        { upsert: true, new: true }
      );
    }

    return res.status(200).json({
      success: true,
      message: "N11 siparişleri başarıyla çekildi",
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("❌ N11 OrderService hata:", error.message);
    return res.status(500).json({
      success: false,
      message: "N11 sipariş çekme hatası",
      error: error.message,
    });
  }
}
