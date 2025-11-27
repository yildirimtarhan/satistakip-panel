// 📁 /pages/api/n11/orders/index.js
import axios from "axios";
import xml2js from "xml2js";
import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";

// N11 ortam URL'i (Render Environment'tan okunur)
const ORDER_SERVICE_URL =
  process.env.N11_ORDER_SERVICE_URL ||
  "https://api.n11.com/ws/OrderService.wsdl";

export default async function handler(req, res) {
  // Sadece GET
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ success: false, message: "Only GET method is allowed" });
  }

  try {
    /* ──────────────────────────────────────────────
       1) TOKEN KONTROLÜ
    ────────────────────────────────────────────── */
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Token gerekli" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Geçersiz veya süresi dolmuş token",
      });
    }

    const userId = decoded.userId;

    /* ──────────────────────────────────────────────
       2) ENV KONTROLLERİ
    ────────────────────────────────────────────── */
    const appKey = process.env.N11_APP_KEY;
    const appSecret = process.env.N11_APP_SECRET;

    if (!appKey || !appSecret) {
      return res.status(500).json({
        success: false,
        message: "N11_APP_KEY veya N11_APP_SECRET tanımlı değil",
      });
    }

    if (!ORDER_SERVICE_URL) {
      return res.status(500).json({
        success: false,
        message: "N11_ORDER_SERVICE_URL tanımlı değil",
      });
    }

    /* ──────────────────────────────────────────────
       3) N11 GetOrderList SOAP BODY (dokümana göre)
    ────────────────────────────────────────────── */
    const xmlRequest = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://www.n11.com/ws/schemas">
        <soapenv:Header/>
        <soapenv:Body>
          <sch:GetOrderListRequest>
            <auth>
              <appKey>${appKey}</appKey>
              <appSecret>${appSecret}</appSecret>
            </auth>
            <!-- Tüm sipariş durumlarını getirmek için -->
            <status>-1</status>
            <pagingData>
              <currentPage>0</currentPage>
              <pageSize>50</pageSize>
            </pagingData>
          </sch:GetOrderListRequest>
        </soapenv:Body>
      </soapenv:Envelope>
    `;

    /* ──────────────────────────────────────────────
       4) N11'e istek
    ────────────────────────────────────────────── */
    let response;
    try {
      response = await axios.post(ORDER_SERVICE_URL, xmlRequest, {
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          // Bazı ortamlar SOAPAction istiyor; doküman ismini verelim
          SOAPAction: "http://www.n11.com/ws/GetOrderList",
        },
        timeout: 30000,
      });
    } catch (err) {
      // HTTP seviyesinde hata (404, 500 vs) → UI'da net mesaj gösterelim
      if (axios.isAxiosError(err)) {
        console.error("🔥 N11 Order Fetch AxiosError:", {
          url: ORDER_SERVICE_URL,
          status: err.response?.status,
          data: err.response?.data,
          code: err.code,
        });

        const httpStatus = err.response?.status || 500;
        const msg =
          httpStatus === 404
            ? "N11 sipariş servisine ulaşırken hata oluştu. (HTTP 404)"
            : `N11 sipariş servisine ulaşırken hata oluştu. (HTTP ${httpStatus})`;

        return res.status(502).json({
          success: false,
          message: msg,
        });
      }

      console.error("🔥 N11 Order Fetch Error (request seviyesinde):", err);
      return res.status(500).json({
        success: false,
        message: "N11 sipariş servisine erişilirken bilinmeyen hata oluştu.",
      });
    }

    /* ──────────────────────────────────────────────
       5) XML → JSON
    ────────────────────────────────────────────── */
    const parsed = await xml2js.parseStringPromise(response.data, {
      explicitArray: false,
      ignoreAttrs: true,
    });

    const body = parsed?.Envelope?.Body;

    const result =
      body?.GetOrderListResponse?.result ||
      body?.getOrderListResponse?.result ||
      {};

    const status = result?.status;
    const resultMessage =
      result?.errorMessage || result?.resultMessage || result?.message;

    if (status && String(status).toUpperCase() !== "SUCCESS") {
      console.error("❌ N11 GetOrderList result error:", result);
      return res.status(502).json({
        success: false,
        message:
          "N11 GetOrderList başarısız: " +
          (resultMessage || result?.statusCode || status),
        n11Result: result,
      });
    }

    // Sipariş listesi
    const orderListNode =
      body?.GetOrderListResponse?.orderList?.order ||
      body?.getOrderListResponse?.orderList?.order ||
      [];

    const ordersRaw = Array.isArray(orderListNode)
      ? orderListNode
      : orderListNode
      ? [orderListNode]
      : [];

    /* ──────────────────────────────────────────────
       6) MongoDB bağlantısı
    ────────────────────────────────────────────── */
    const client = await clientPromise;
    const db = client.db("satistakip");
    const col = db.collection("n11orders");

    const savedOrders = [];

    for (const o of ordersRaw) {
      if (!o) continue;

      // 👤 Buyer bilgisi
      const buyer = {
        fullName: o.buyer?.fullName || "",
        email: o.buyer?.email || "",
        gsm: o.buyer?.gsm || "",
        taxId: o.buyer?.taxId || "",
        taxOffice: o.buyer?.taxOffice || "",
      };

      // 📮 Kargo adresi
      const shippingAddress = {
        city: o.shippingAddress?.city || "",
        district: o.shippingAddress?.district || "",
        neighborhood: o.shippingAddress?.neighborhood || "",
        address:
          o.shippingAddress?.fullAddress?.address ||
          o.shippingAddress?.address ||
          "",
        postalCode:
          o.shippingAddress?.postalCode ||
          o.shippingAddress?.fullAddress?.postalCode ||
          "",
      };

      // 🧾 Kalemler
      const itemsRaw = o.itemList?.item || [];
      const itemsArr = Array.isArray(itemsRaw)
        ? itemsRaw
        : itemsRaw
        ? [itemsRaw]
        : [];

      const items = itemsArr.map((item) => ({
        id: item.id,
        sellerStockCode: item.sellerStockCode,
        quantity: Number(item.quantity || 1),
        price: Number(item.price || item.amount || 0),
        status: item.status,
        productId: item.productId,
        productName: item.productName,
      }));

      const doc = {
        orderNumber: o.id || o.orderNumber,
        orderStatus: o.orderStatus || "",
        itemStatus: o.itemStatus || "",
        totalPrice:
          Number(o.amount || 0) ||
          Number(o.totalAmount?.value || 0) ||
          Number(o.totalPrice || 0),
        orderDate: o.createDate || o.orderDate || null,
        buyer,
        shippingAddress,
        items,
        userId,
        raw: o,
        updatedAt: new Date(),
      };

      if (!doc.orderNumber) continue;

      // 🔁 Upsert (aynı sipariş tekrar gelirse güncelle)
      await col.updateOne(
        { orderNumber: doc.orderNumber, userId },
        {
          $setOnInsert: { createdAt: new Date() },
          $set: doc,
        },
        { upsert: true }
      );

      savedOrders.push(doc);
    }

    /* ──────────────────────────────────────────────
       7) Response
    ────────────────────────────────────────────── */
    return res.status(200).json({
      success: true,
      count: savedOrders.length,
      orders: savedOrders,
    });
  } catch (err) {
    console.error("🔥 N11 Order Fetch Error (top-level):", err);
    return res.status(500).json({
      success: false,
      message: "Sunucu hatası",
    });
  }
}
