// 📁 /pages/api/n11/orders/index.js
import axios from "axios";
import xml2js from "xml2js";
import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";

// ✔ N11’in canlı sipariş servisi (TEK doğru endpoint)
const ORDER_SERVICE_URL =
  process.env.N11_ORDER_SERVICE_URL ||
  "https://api.n11.com/ws/OrderService";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ success: false, message: "Only GET method is allowed" });
  }

  try {
    /* ──────────────────────────────────────────────
       1) TOKEN DOĞRULAMA
    ────────────────────────────────────────────── */
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
    } catch (e) {
      return res.status(401).json({
        success: false,
        message: "Geçersiz veya süresi dolmuş token",
      });
    }

    const userId = decoded.userId;

    /* ──────────────────────────────────────────────
       2) ENV KONTROLÜ
    ────────────────────────────────────────────── */
    const appKey = process.env.N11_APP_KEY;
    const appSecret = process.env.N11_APP_SECRET;

    if (!appKey || !appSecret) {
      return res.status(500).json({
        success: false,
        message: "N11_APP_KEY veya N11_APP_SECRET eksik",
      });
    }

    /* ──────────────────────────────────────────────
       3) SOAP XML — N11 DOKÜMANA %100 UYUMLU
    ────────────────────────────────────────────── */
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
            <status>-1</status>
          </sch:GetOrderListRequest>
        </soapenv:Body>
      </soapenv:Envelope>
    `;

    /* ──────────────────────────────────────────────
       4) N11 → DOĞRU SOAPAction ile POST
    ────────────────────────────────────────────── */
    let response;
    try {
      response = await axios.post(ORDER_SERVICE_URL, xmlRequest, {
        headers: {
          "Content-Type": "text/xml; charset=utf-8",

          // ✔ N11 dokümanında zorunlu SOAPAction
          SOAPAction:
            "http://www.n11.com/ws/schemas/OrderServicePort/GetOrderList",
        },
        timeout: 20000,
      });
    } catch (err) {
      console.error("🔥 N11 HTTP HATASI:", {
        url: ORDER_SERVICE_URL,
        status: err.response?.status,
        data: err.response?.data,
      });

      return res.status(502).json({
        success: false,
        message:
          err.response?.status === 404
            ? "N11 servisine ulaşılamadı (404 No Mapping Rule)"
            : `N11 servis hatası: ${err.response?.status || "?"}`,
      });
    }

    /* ──────────────────────────────────────────────
       5) XML → JSON
    ────────────────────────────────────────────── */
    const parsed = await xml2js.parseStringPromise(response.data, {
      explicitArray: false,
      ignoreAttrs: true,
    });

    const result =
      parsed?.Envelope?.Body?.GetOrderListResponse?.result || {};

    if (result.status !== "SUCCESS") {
      return res.status(502).json({
        success: false,
        message:
          result.errorMessage ||
          result.resultMessage ||
          "N11 GetOrderList başarısız",
        n11Result: result,
      });
    }

    /* ──────────────────────────────────────────────
       6) Sipariş Listeleme
    ────────────────────────────────────────────── */
    const orderNode =
      parsed?.Envelope?.Body?.GetOrderListResponse?.orderList?.order || [];

    const orders = Array.isArray(orderNode) ? orderNode : [orderNode];

    /* ──────────────────────────────────────────────
       7) MongoDB KAYIT
    ────────────────────────────────────────────── */
    const client = await clientPromise;
    const db = client.db("satistakip");
    const col = db.collection("n11orders");

    const savedOrders = [];

    for (let o of orders) {
      if (!o) continue;

      const doc = {
        orderNumber: o.id,
        orderStatus: o.orderStatus,
        buyer: o.buyer,
        shippingAddress: o.shippingAddress,
        items: Array.isArray(o.itemList?.item)
          ? o.itemList.item
          : [o.itemList?.item],
        totalPrice: o.totalPrice || o.amount,
        orderDate: o.createDate,
        userId,
        raw: o,
        updatedAt: new Date(),
      };

      await col.updateOne(
        { orderNumber: doc.orderNumber, userId },
        { $set: doc, $setOnInsert: { createdAt: new Date() } },
        { upsert: true }
      );

      savedOrders.push(doc);
    }

    /* ──────────────────────────────────────────────
       8) FRONTEND’E DÖN
    ────────────────────────────────────────────── */
    return res.status(200).json({
      success: true,
      count: savedOrders.length,
      orders: savedOrders,
    });
  } catch (err) {
    console.error("🔥 TOP LEVEL N11 ERROR:", err);
    return res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
}
