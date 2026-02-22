import dbConnect from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ success: false, message: "Only GET method is allowed" });
  }

  try {
    await dbConnect();

    
    const authHeader = req.headers.authorization || "";
const token = authHeader.startsWith("Bearer ")
  ? authHeader.split(" ")[1]
  : null;


    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token eksik",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyId = decoded.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "companyId bulunamadı",
      });
    }

    // ✅ 1) Önce DB'den oku
    const brandsFromDb = await mongoose.connection.db
      .collection("n11brands")
      .find({ companyId: new mongoose.Types.ObjectId(companyId) })
      .sort({ name: 1 })
      .toArray();

    // ✅ DB doluysa direkt dön
    if (brandsFromDb && brandsFromDb.length > 0) {
      return res.status(200).json({
        success: true,
        brands: brandsFromDb.map((b) => ({
          id: b.id,
          name: b.name,
        })),
        count: brandsFromDb.length,
        source: "db",
      });
    }

    // ✅ 2) DB boşsa fallback: N11 CDN üzerinden kategoriye göre marka çek
    const { categoryId } = req.query;

    if (!categoryId) {
      // DB boş + categoryId yok → boş dön
      return res.status(200).json({
        success: true,
        brands: [],
        count: 0,
        source: "db-empty",
      });
    }

    // settings collection içinden appKey al
    const settings = await mongoose.connection.db
      .collection("settings")
      .findOne({ companyId: new mongoose.Types.ObjectId(companyId) });

    const appKey = settings?.n11?.appKey;

    if (!appKey) {
      return res.status(400).json({
        success: false,
        message: "N11 appKey bulunamadı (settings)",
      });
    }

    const url = `https://api.n11.com/cdn/category/${categoryId}/attribute`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        appkey: appKey,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(500).json({
        success: false,
        message: "N11 attribute API hata",
        detail: text,
      });
    }

    const data = await response.json();

    const attrs = data?.categoryAttributes || [];
    const markaAttr = attrs.find(
      (a) => (a?.attributeName || "").toLowerCase() === "marka"
    );

    const brands = markaAttr?.attributeValues || [];

    return res.status(200).json({
      success: true,
      brands: brands.map((b) => ({
        id: b.id,
        name: b.value,
      })),
      count: brands.length,
      source: "cdn",
    });
  } catch (error) {
    console.error("❌ /api/n11/brands error:", error);

    return res.status(500).json({
      success: false,
      message: "N11 marka listesi alınamadı",
      error: error.message || "Unknown error",
    });
  }
}
