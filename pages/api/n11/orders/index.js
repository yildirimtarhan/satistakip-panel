// 📁 /pages/api/n11/orders/index.js
import axios from "axios";
import xml2js from "xml2js";
import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";

// ✔ N11'in doğru SOAP endpoint'i
const ORDER_SERVICE_URL =
  process.env.N11_ORDER_SERVICE_URL ||
  "https://api.n11.com/ws/OrderService";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Only GET method is allowed",
    });
  }

  try {
    // 1) Token kontrol
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return res.status(401).json({ success: false, message: "Token gerekli" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Geçersiz token",
      });
    }

    const userId = decoded.userId;

    // 2) N11 Key kontrol
    const appKey = process.env.N11_APP_KEY;
    const appSecret = process.env.N11_APP_SECRET;

    if (!appKey || !appSecret) {
      return res.status(500).json({
        success: false,
        message: "N11_APP_KEY veya SECRET eksik",
      });
    }

    // 3) ✔ DÜZELTİLMİŞ XML SOAP Request (N11 dökümanına %100 uyumlu)
    const xmlRequest = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
        xmlns:sch="http://www.n11.com/ws/schemas">
      <soapenv:Header/>
      <soapenv:Body>
        <sch:GetOrderListRequest>
          <auth>
            <appKey>${appKey}</appKey>
            <appSecret>${appSecret}</appSecret>
          </auth>

          <pagingData>
            <currentPage>0</currentPage>
            <pageSize>50</pageSize>
          </pagingData>

          <searchData>
            <status>-1</status>
          </searchData>

        </sch:GetOrderListRequest>
      </soapenv:Body>
    </soapenv:Envelope>
    `;

    // 4) İstek gönder
    let response;
    try {
      response = await axios.post(ORDER_SERVICE_URL, xmlRequest, {
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction:
            "http://www.n11.com/ws/schemas/OrderServicePort/GetOrderList",
        },
        timeout: 30000,
      });
    } catch (err) {
      console.error("🔥 N11 HTTP HATASI:", {
        url: ORDER_SERVICE_URL,
        status: err.response?.status,
        data: err.response?.data,
      });

      return res.status(500).json({
        success: false,
        message: "N11 servis hatası",
        error: err.response?.data || err.message,
      });
    }

    // 5) XML → JSON
    const parsed = await xml2js.parseStringPromise(response.data, {
      explicitArray: false,
      ignoreAttrs: true,
    });

    const orders =
      parsed?.Envelope?.Body?.GetOrderListResponse?.orderList?.order || [];

    const ordersArray = Array.isArray(orders) ? orders : [orders];

    // 6) MongoDB Kaydet
    const client = await clientPromise;
    const db = client.db("satistakip");

    for (const o of ordersArray) {
      if (!o) continue;

      await db.collection("n11orders").updateOne(
        { orderNumber: o.id, userId },
        {
          $set: {
            orderNumber: o.id,
            buyer: o.buyer,
            items: o.itemList?.item || [],
            raw: o,
          },
        },
        { upsert: true }
      );
    }

    return res.status(200).json({
      success: true,
      orders: ordersArray,
    });
  } catch (err) {
    console.error("🔥 Genel Hata:", err);
    return res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
}
