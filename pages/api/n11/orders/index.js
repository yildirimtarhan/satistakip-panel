// 📁 /pages/api/n11/orders/index.js
import axios from "axios";
import xml2js from "xml2js";
import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";

const ORDER_SERVICE_URL =
  process.env.N11_ORDER_SERVICE_URL || "https://api.n11.com/ws/orderService/";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Only GET allowed" });
  }

  try {
    // 🔐 1) TOKEN KONTROLÜ
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
      return res
        .status(401)
        .json({ success: false, message: "Geçersiz veya süresi dolmuş token" });
    }

    const userId = decoded.userId;

    if (!process.env.N11_APP_KEY || !process.env.N11_APP_SECRET) {
      return res.status(500).json({
        success: false,
        message: "N11 APP KEY / SECRET environment değişkenleri eksik",
      });
    }

    // 🌐 2) SOAP BODY (Dokümana uygun GetOrderListRequest)
    const xmlRequest = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://www.n11.com/ws/schemas">
        <soapenv:Header/>
        <soapenv:Body>
          <sch:GetOrderListRequest>
            <auth>
              <appKey>${process.env.N11_APP_KEY}</appKey>
              <appSecret>${process.env.N11_APP_SECRET}</appSecret>
            </auth>
            <!-- Tüm durumlar için -1 -->
            <status>-1</status>
            <pagingData>
              <currentPage>0</currentPage>
              <pageSize>50</pageSize>
            </pagingData>
          </sch:GetOrderListRequest>
        </soapenv:Body>
      </soapenv:Envelope>
    `;

    // 🌍 3) N11 OrderService çağrısı
    const response = await axios.post(ORDER_SERVICE_URL, xmlRequest, {
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
      },
      timeout: 30000,
    });

    // 🧩 4) XML → JSON
    const parsed = await xml2js.parseStringPromise(response.data, {
      explicitArray: false,
      ignoreAttrs: true,
    });

    const body = parsed?.Envelope?.Body;
    const result =
      body?.GetOrderListResponse?.result ||
      body?.getOrderListResponse?.result ||
      {};

    const status = result.status;
    const statusCode = result.statusCode;
    const resultMessage = result.errorMessage || result.resultMessage;

    if (status && status.toUpperCase() !== "SUCCESS") {
      console.error("N11 GetOrderList hata sonucu:", result);
      return res.status(502).json({
        success: false,
        message:
          "N11 GetOrderList başarısız: " +
          (resultMessage || statusCode || status || "Bilinmeyen hata"),
        n11Result: result,
      });
    }

    const orderList =
      body?.GetOrderListResponse?.orderList?.order ||
      body?.getOrderListResponse?.orderList?.order ||
      [];

    const orders = Array.isArray(orderList) ? orderList : orderList ? [orderList] : [];

    // 📦 5) MongoDB bağlantısı
    const client = await clientPromise;
    const db = client.db("satistakip");
    const col = db.collection("n11orders");

    const savedOrders = [];

    for (const o of orders) {
      if (!o) continue;

      // 👤 Buyer
      const buyer = {
        fullName: o.buyer?.fullName || "",
        email: o.buyer?.email || "",
        gsm: o.buyer?.gsm || "",
        taxId: o.buyer?.taxId || "",
        taxOffice: o.buyer?.taxOffice || "",
      };

      // 📮 Adres
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
      const itemsArr = Array.isArray(itemsRaw) ? itemsRaw : itemsRaw ? [itemsRaw] : [];

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
        createdAt: new Date(),
      };

      if (!doc.orderNumber) continue;

      // 🔁 6) Upsert (aynı sipariş tekrar gelirse güncelle)
      await col.updateOne(
        { orderNumber: doc.orderNumber, userId },
        { $set: doc },
        { upsert: true }
      );

      savedOrders.push(doc);
    }

    return res.status(200).json({
      success: true,
      count: savedOrders.length,
      orders: savedOrders,
    });
  } catch (err) {
    // Ayrıntılı log
    if (axios.isAxiosError(err)) {
      console.error("🔥 N11 Order Fetch AxiosError:", {
        url: ORDER_SERVICE_URL,
        status: err.response?.status,
        data: err.response?.data,
        code: err.code,
      });
      return res.status(502).json({
        success: false,
        message:
          "N11 sipariş servisine ulaşırken hata oluştu. (HTTP " +
          (err.response?.status || err.code || "bilinmiyor") +
          ")",
      });
    }

    console.error("🔥 N11 Order Fetch Error (genel):", err);
    return res.status(500).json({
      success: false,
      message: "Sunucu hatası",
    });
  }
}
