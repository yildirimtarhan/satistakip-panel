// 📁 /pages/api/n11/orders/index.js
import axios from "axios";
import xml2js from "xml2js";
import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";
import { pushOrderToERP } from "@/lib/erpService"; // ERP servis çağrısı

const ORDER_SERVICE_URL =
  process.env.N11_ORDER_SERVICE_URL || "https://api.n11.com/ws/OrderService";

// Opsiyonel: query ile sayfa ve durum filtreleri (varsayılan: page=1, status=-1)
function getQueryParams(req) {
  const page = Number(req.query.page || 1);
  const pageSize = Number(req.query.pageSize || 50);
  const status = req.query.status ?? "-1"; // -1: tüm siparişler
  return { page, pageSize, status };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Only GET method is allowed",
    });
  }

  try {
    // 1) Token ve rol kontrol
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
    } catch {
      return res.status(401).json({ success: false, message: "Geçersiz token" });
    }

    const userId = decoded.userId;
    const role = decoded.role || "user"; // "admin" tüm kayıtları görür

    // 2) N11 credential kontrol
    const appKey = process.env.N11_APP_KEY;
    const appSecret = process.env.N11_APP_SECRET;
    if (!appKey || !appSecret) {
      return res.status(500).json({
        success: false,
        message: "N11_APP_KEY veya N11_APP_SECRET eksik",
      });
    }

    // 3) Query parametreleri
    const { page, pageSize, status } = getQueryParams(req);

    // 4) SOAP XML Request (GetOrderListRequest)
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
            <currentPage>${page}</currentPage>
            <pageSize>${pageSize}</pageSize>
          </pagingData>
          <searchData>
            <status>${status}</status>
          </searchData>
        </sch:GetOrderListRequest>
      </soapenv:Body>
    </soapenv:Envelope>`;

    // 5) İstek gönder
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

    // 6) XML → JSON parse ve Fault kontrol
    const parsed = await xml2js.parseStringPromise(response.data, {
      explicitArray: false,
      ignoreAttrs: true,
    });

    const fault = parsed?.Envelope?.Body?.Fault;
    if (fault) {
      return res.status(502).json({
        success: false,
        message: "N11 Fault döndürdü",
        fault,
      });
    }

    const ordersNode =
      parsed?.Envelope?.Body?.GetOrderListResponse?.orderList?.order || [];
    const ordersArray = Array.isArray(ordersNode)
      ? ordersNode
      : ordersNode
      ? [ordersNode]
      : [];

    // 7) MongoDB bağlan ve kayıt/ERP push işlemi
    const client = await clientPromise;
    const db = client.db("satistakip");
    const col = db.collection("n11orders");

    let processedCount = 0;
    let pushedToERP = 0;

    for (const o of ordersArray) {
      if (!o) continue;

      // Normalize: alan isimleri N11 dönüşüne göre değişebilir
      const orderDoc = {
        orderNumber: o.orderNumber || o.id || o?.orderId || "",
        buyerName: o.buyer?.name || o.buyer?.fullName || "",
        buyerEmail: o.buyer?.email || "",
        items: o.itemList?.item
          ? Array.isArray(o.itemList.item)
            ? o.itemList.item
            : [o.itemList.item]
          : [],
        totalPrice: Number(o.totalAmount || o.totalPrice || 0),
        shippingAddress: {
          city: o.shippingAddress?.city || "",
          district: o.shippingAddress?.district || "",
          address: o.shippingAddress?.address || "",
        },
        status: o.status ?? null,
        createdAt: new Date(),
        raw: o,
        userId,
      };

      if (!orderDoc.orderNumber) {
        console.warn("⚠️ orderNumber eksik, kayıt atlandı:", { raw: o });
        continue;
      }

      // Mevcut kayıt var mı?
      const existing = await col.findOne({
        orderNumber: orderDoc.orderNumber,
        userId,
      });

      // Upsert kayıt
      await col.updateOne(
        { orderNumber: orderDoc.orderNumber, userId },
        {
          $set: {
            buyerName: orderDoc.buyerName,
            buyerEmail: orderDoc.buyerEmail,
            items: orderDoc.items,
            totalPrice: orderDoc.totalPrice,
            shippingAddress: orderDoc.shippingAddress,
            status: orderDoc.status,
            raw: orderDoc.raw,
            userId,
          },
          $setOnInsert: { createdAt: orderDoc.createdAt, erpPushed: false },
        },
        { upsert: true }
      );

      // ERP'ye push: sadece yeni veya henüz push edilmemiş olanlar
      const shouldPush = !existing || !existing.erpPushed;
      if (shouldPush) {
        try {
          const erpResponse = await pushOrderToERP(orderDoc);
          await col.updateOne(
            { orderNumber: orderDoc.orderNumber, userId },
            {
              $set: {
                erpPushed: true,
                erpPushedAt: new Date(),
                erpResponseRef:
                  erpResponse?.id || erpResponse?.reference || null,
              },
            }
          );
          pushedToERP += 1;
        } catch (erpErr) {
          console.error("🔥 ERP push hatası:", erpErr?.message || erpErr);
          // ERP hatası sipariş kaydını engellemez, sadece push flag'i false kalır
        }
      }

      processedCount += 1;
    }

    // 8) Role bazlı görünürlük
    const query = role === "admin" ? {} : { userId };
    const resultOrders = await col
      .find(query, { projection: { raw: 0 } }) // raw'ı listelemede gizli tut
      .sort({ erpPushedAt: -1, createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      meta: {
        page,
        pageSize,
        status,
        processedCount,
        pushedToERP,
      },
      orders: resultOrders,
    });
  } catch (err) {
    console.error("🔥 Genel Hata:", err);
    return res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
}