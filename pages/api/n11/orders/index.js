import axios from "axios";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/mongodb";
import N11Order from "@/models/N11Order";
import { getN11SettingsFromRequest } from "@/lib/n11Settings";

const ORDER_REST_URL = "https://api.n11.com/rest/delivery/v1/shipmentPackages";

// ✅ Authorization + Cookie token reader
function getTokenFromRequest(req) {
  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    if (token) return token;
  }

  const cookieHeader = req.headers.cookie || "";
  const tokenCookie = cookieHeader
    .split("; ")
    .find((c) => c.startsWith("token="));

  if (tokenCookie) {
    return tokenCookie.split("=")[1];
  }

  return null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Only GET allowed" });
  }

  try {
    console.log("=== N11 ORDERS API HIT ===");
    console.log("Authorization Header:", req.headers.authorization);
    console.log("Cookie Header:", req.headers.cookie);

    const token = getTokenFromRequest(req);
    console.log("TOKEN FOUND?:", !!token);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token gerekli (Authorization veya Cookie).",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      console.log("JWT VERIFY ERROR:", err?.message);
      return res.status(401).json({ success: false, message: "Geçersiz token" });
    }

    console.log("DECODED TOKEN:", decoded);

    const userId = decoded.userId || decoded.id || decoded._id;
    const companyId = decoded.companyId || null;

    console.log("USER ID:", userId);
    console.log("COMPANY ID:", companyId);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message:
          "companyId bulunamadı. Multi-tenant için token companyId içermeli.",
      });
    }

    // ✅ Mongo connect
    await dbConnect();

    // ✅ DB Settings + ENV fallback
    const cfg = await getN11SettingsFromRequest(req);

    console.log("N11 SETTINGS CFG:", cfg);

    const appKey = cfg?.appKey || process.env.N11_APP_KEY || "";
    const appSecret = cfg?.appSecret || process.env.N11_APP_SECRET || "";
    const env =
      cfg?.environment ||
      cfg?.env ||
      process.env.N11_ENVIRONMENT ||
      "production";

    if (!appKey || !appSecret) {
      return res.status(500).json({
        success: false,
        message: "N11 API bilgileri eksik (settings veya env).",
      });
    }

    // ✅ TEST LOG
    console.log("N11 APPKEY:", appKey);
    console.log("N11 ENV:", env);

    const response = await axios.get(ORDER_REST_URL, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",

        // ✅ N11 auth
        appkey: appKey,
        appsecret: appSecret,
      },
      params: {
        page: 0,
        pageSize: 50,
      },
      timeout: 30000,
    });

    console.log("N11 RAW RESPONSE:", JSON.stringify(response.data, null, 2));

    // ✅✅✅ FIX: N11 siparişler "content" içinde geliyor
    const packages = response.data?.content || [];

    let processedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;

    for (const pkg of packages) {
      const orderNumber = pkg.orderNumber;
      if (!orderNumber) continue;

      const doc = {
        companyId,
        userId,
        createdBy: userId,
        orderNumber,

        status: pkg.shipmentPackageStatus || pkg.status || "",
        buyerName: pkg.customerfullName || pkg.buyerName || "",
        trackingNumber: pkg.cargoTrackingNumber || pkg.trackingNumber || "",
        cargoCompany: pkg.cargoProviderName || pkg.cargoCompany || "",

        quantity: Number(pkg?.lines?.[0]?.quantity || 0),
        totalAmount: Number(pkg.totalAmount || 0),
        currency: "TRY",

        raw: pkg,
        accountId: null,
      };

      const existing = await N11Order.findOne({ companyId, orderNumber });

      await N11Order.findOneAndUpdate(
        { companyId, orderNumber },
        { $set: doc, $setOnInsert: { erpPushed: false } },
        { upsert: true, new: true }
      );

      processedCount++;
      if (!existing) createdCount++;
      else updatedCount++;
    }

    const orders = await N11Order.find({ companyId })
      .sort({ createdAt: -1 })
      .limit(200);

    return res.status(200).json({
      success: true,
      source: cfg?.source || "env",
      meta: {
        fetched: packages.length,
        processedCount,
        createdCount,
        updatedCount,
      },
      orders,
    });
  } catch (err) {
    console.error("N11 ORDERS INDEX ERROR:", err?.response?.data || err);
    return res.status(500).json({
      success: false,
      message: "N11 siparişleri çekilemedi",
      error: err?.response?.data || err?.message || String(err),
    });
  }
}
