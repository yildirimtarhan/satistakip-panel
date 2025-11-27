// /pages/api/n11/orders/index.js
import axios from "axios";
import xml2js from "xml2js";
import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Only GET allowed" });
  }

  try {
    // 🔐 TOKEN KONTROLÜ
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) return res.status(401).json({ message: "Token gerekli" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // 🌍 N11 URL doğrulaması
    const n11Url = process.env.N11_BASE_URL?.trim();
    if (!n11Url) {
      return res.status(500).json({
        success: false,
        message: "N11_BASE_URL tanımlı değil",
      });
    }

    // 🌐 SOAP Body (CANLI ortam)
    const xmlRequest = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://www.n11.com/ws/schemas">
        <soapenv:Header/>
        <soapenv:Body>
          <sch:GetOrderListRequest>
            <auth>
              <appKey>${process.env.N11_API_KEY}</appKey>
              <appSecret>${process.env.N11_API_SECRET}</appSecret>
            </auth>
            <status>-1</status>
            <pagingData>
              <currentPage>0</currentPage>
              <pageSize>50</pageSize>
            </pagingData>
          </sch:GetOrderListRequest>
        </soapenv:Body>
      </soapenv:Envelope>
    `;

    // 📡 N11 canlı API’ye istek
    const response = await axios.post(n11Url, xmlRequest, {
      headers: { "Content-Type": "text/xml" },
      timeout: 30000,
    });

    // 🧩 XML → JSON
    const parsed = await xml2js.parseStringPromise(response.data, {
      explicitArray: false,
      ignoreAttrs: true,
    });

    const rawOrders =
      parsed?.Envelope?.Body?.GetOrderListResponse?.orderList?.order || [];

    const orders = Array.isArray(rawOrders) ? rawOrders : [rawOrders];

    const client = await clientPromise;
    const db = client.db("satistakip");

    const saved = [];

    for (const o of orders) {
      const doc = {
        orderNumber: o.id,
        buyer: o.buyer || {},
        shippingAddress: o.shippingAddress || {},
        items: Array.isArray(o.itemList?.item)
          ? o.itemList.item
          : [o.itemList?.item].filter(Boolean),
        totalPrice: Number(o.amount || 0),
        orderStatus: o.orderStatus || "",
        userId,
        raw: o,
      };

      const exist = await db
        .collection("n11orders")
        .findOne({ orderNumber: doc.orderNumber, userId });

      if (!exist) {
        await db.collection("n11orders").insertOne(doc);
      }

      saved.push(doc);
    }

    return res.status(200).json({
      success: true,
      orders: saved,
    });

  } catch (err) {
    console.error("🔥 N11 Order Fetch Error:", err);
    return res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
};
