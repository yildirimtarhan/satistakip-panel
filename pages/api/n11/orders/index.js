// 📁 /pages/api/n11/orders/index.js (REST + Mongoose uyumlu)
import axios from "axios";
import jwt from "jsonwebtoken";
import dbConnect, { connectToDatabase } from "@/lib/mongodb";
import { pushOrderToERP } from "@/lib/erpService";

const ORDER_REST_URL =
  "https://api.n11.com/rest/delivery/v1/shipmentPackages";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Only GET allowed" });
  }

  try {
    // 1) Token kontrol
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) return res.status(401).json({ success: false, message: "Token gerekli" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: "Geçersiz token" });
    }

    const userId = decoded.userId;
    const role = decoded.role || "user";

    // 2) Mongo bağlantısı
    await dbConnect();
    const { db } = await connectToDatabase();
    const col = db.collection("n11orders");

    // 3) API anahtarları
    const appKey = process.env.N11_APP_KEY;
    const appSecret = process.env.N11_APP_SECRET;

    if (!appKey || !appSecret) {
      return res.status(500).json({
        success: false,
        message: "N11_APP_KEY veya N11_APP_SECRET eksik",
      });
    }

    // 4) REST isteği
    let response;
    try {
      response = await axios.get(ORDER_REST_URL, {
        headers: {
          appKey,
          appSecret,
        },
        params: { page: 0, pageSize: 50 },
        timeout: 30000,
      });
    } catch (err) {
      console.error("🔥 N11 REST HATASI:", err.response?.data);
      return res.status(500).json({
        success: false,
        message: "N11 REST servis hatası",
        error: err.response?.data || err.message,
      });
    }

    const packages = response.data?.data?.shipmentPackages || [];

    let processedCount = 0;
    let pushedToERP = 0;

    for (const pkg of packages) {
      const orderNumber = pkg.orderNumber;
      if (!orderNumber) continue;

      const doc = {
        orderNumber,
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

      const existing = await col.findOne({ orderNumber, userId });

      await col.updateOne(
        { orderNumber, userId },
        {
          $set: doc,
          $setOnInsert: { erpPushed: false },
        },
        { upsert: true }
      );

      if (!existing || !existing.erpPushed) {
        try {
          const erpRes = await pushOrderToERP(doc);
          await col.updateOne(
            { orderNumber, userId },
            {
              $set: {
                erpPushed: true,
                erpPushedAt: new Date(),
                erpResponseRef: erpRes?.id || erpRes?.reference,
              },
            }
          );
          pushedToERP++;
        } catch (err) {
          console.error("ERP Push hatası:", err);
        }
      }

      processedCount++;
    }

    // 5) Siparişleri listele
    const query = role === "admin" ? {} : { userId };
    const orders = await col
      .find(query, { projection: { raw: 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      meta: { processedCount, pushedToERP },
      orders,
    });
  } catch (err) {
    console.error("🔥 Genel Hata:", err);
    res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
}
