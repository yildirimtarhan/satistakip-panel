// 📁 /pages/api/n11/orders/live.js
import axios from "axios";
import xml2js from "xml2js";
import clientPromise from "@/lib/mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Only GET method allowed" });
  }

  const { N11_APP_KEY, N11_APP_SECRET } = process.env;

  const xml = `<?xml version="1.0" encoding="utf-8"?>
  <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:sch="http://www.n11.com/ws/schemas">
    <soapenv:Header/>
    <soapenv:Body>
      <sch:DetailedOrderListRequest>
        <auth>
          <appKey>${N11_APP_KEY}</appKey>
          <appSecret>${N11_APP_SECRET}</appSecret>
        </auth>
        <pagingData>
          <currentPage>0</currentPage>
          <pageSize>10</pageSize>
        </pagingData>
        <searchData>
          <status>1</status> <!-- 1 = yeni siparişler -->
        </searchData>
      </sch:DetailedOrderListRequest>
    </soapenv:Body>
  </soapenv:Envelope>`;

  try {
    const { data } = await axios.post("https://api.n11.com/ws/OrderService.wsdl", xml, {
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    });

    const parser = new xml2js.Parser({ explicitArray: false });
    const json = await parser.parseStringPromise(data);

    const orders =
      json["soapenv:Envelope"]?.["soapenv:Body"]?.["ns3:DetailedOrderListResponse"]?.orderList
        ?.order || [];

    const client = await clientPromise;
    const db = client.db("satistakip");
    const ordersCollection = db.collection("n11_orders_live");

    if (Array.isArray(orders)) {
      for (const order of orders) {
        await ordersCollection.updateOne(
          { orderNumber: order.orderNumber },
          { $set: { ...order, syncedAt: new Date(), source: "n11-live" } },
          { upsert: true }
        );
      }
    }

    res.status(200).json({
      success: true,
      count: Array.isArray(orders) ? orders.length : 0,
      environment: "production",
      message: "N11 canlı siparişler başarıyla alındı",
    });
  } catch (err) {
    console.error("N11 Live API Error:", err.message);
    res.status(500).json({ error: err.message });
  }
}
