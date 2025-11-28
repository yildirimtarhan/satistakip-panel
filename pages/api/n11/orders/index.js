// 📁 /pages/api/n11/orders/index.js (REST Version)
import axios from "axios";
import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";
import { pushOrderToERP } from "@/lib/erpService";

// ✔ N11 yeni REST endpoint
const ORDER_REST_URL =
  "https://api.n11.com/rest/delivery/v1/shipmentPackages";

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
    } catch {
      return res.status(401).json({ success: false, message: "Geçersiz token" });
    }

    const userId = decoded.userId;
    const role = decoded.role || "user";

    // 2) N11 credentials
    const appKey = process.env.N11_APP_KEY;
    const appSecret = process.env.N11_APP_SECRET;

    if (!appKey || !appSecret) {
      return res.status(500).json({
        success: false,
        message: "N11_APP_KEY veya N11_APP_SECRET eksik",
      });
    }

    // 3) REST API'den siparişleri çek (JSON döner)
    let response;
    try {
      response = await axios.get(ORDER_REST_URL, {
        headers: {
          appKey: appKey,
          appSecret: appSecret,
        },
        params: {
          page: 0,
          pageSize: 50,
        },
        timeout: 30000,
      });
    } catch (err) {
      console.error("🔥 N11 REST HATASI:", {
        url: ORDER_REST_URL,
        status: err.response?.status,
        data: err.response?.data,
      });
      return res.status(500).json({
        success: false,
        message: "N11 REST servis hatası",
        error: err.response?.data || err.message,
      });
    }

    const packages = response.data?.data?.shipmentPackages || [];

    // 4) MongoDB bağlantısı
    const client = await clientPromise;
    const db = client.db("satistakip");
    const col = db.collection("n11orders");

    let processedCount = 0;
    let pushedToERP = 0;

    for (const pkg of packages) {
      const orderNumber = pkg.orderNumber;

      if (!orderNumber) continue;

      const orderDoc = {
        orderNumber: orderNumber,
        status: pkg.status,
        trackingNumber: pkg.trackingNumber,
        cargoCompany: pkg.cargoCompany,
        quantity: pkg.totalItemCount,
        price: pkg.totalAmount,
        buyerName: pkg.buyerName,
        address: pkg.shipmentAddress,
        createdAt: new Date(),
        raw: pkg,
        userId,
      };

      // Eski kayıt var mı?
      const existing = await col.findOne({
        orderNumber: orderNumber,
        userId,
      });

      // Upsert
      await col.updateOne(
        { orderNumber: orderNumber, userId },
        {
          $set: {
            status: orderDoc.status,
            trackingNumber: orderDoc.trackingNumber,
            cargoCompany: orderDoc.cargoCompany,
            quantity: orderDoc.quantity,
            price: orderDoc.price,
            buyerName: orderDoc.buyerName,
            address: orderDoc.address,
            raw: orderDoc.raw,
            userId,
          },
          $setOnInsert: {
            createdAt: orderDoc.createdAt,
            erpPushed: false,
          },
        },
        { upsert: true }
      );

      // ERP push
      const shouldPush = !existing || !existing.erpPushed;
      if (shouldPush) {
        try {
          const erpRes = await pushOrderToERP(orderDoc);
          await col.updateOne(
            { orderNumber: orderNumber, userId },
            {
              $set: {
                erpPushed: true,
                erpPushedAt: new Date(),
                erpResponseRef: erpRes?.id || erpRes?.reference || null,
              },
            }
          );
          pushedToERP++;
        } catch (erpErr) {
          console.error("ERP Push Hatası:", erpErr);
        }
      }

      processedCount++;
    }

    // Role göre siparişleri çek
    const query = role === "admin" ? {} : { userId };
    const resultOrders = await col
      .find(query, { projection: { raw: 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      meta: {
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
