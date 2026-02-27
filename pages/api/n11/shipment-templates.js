/**
 * N11 kargo (teslimat) şablonları – firma bazlı listeleme ve kaydetme.
 * N11 panelindeki "Hesabım > Teslimat Bilgilerimiz" ile aynı isimler kullanılmalı.
 */
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";

export default async function handler(req, res) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ success: false, message: "Token gerekli" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyId = decoded.companyId || null;
    const userId = decoded.userId || decoded.id || null;

    const { db } = await connectToDatabase();
    const col = db.collection("settings");
    const query = companyId ? { companyId: new mongoose.Types.ObjectId(companyId) } : { userId: new mongoose.Types.ObjectId(userId) };

    if (req.method === "GET") {
      const doc = await col.findOne(query);
      const list = doc?.n11?.shipmentTemplates || [];
      return res.status(200).json({ success: true, templates: list });
    }

    if (req.method === "POST") {
      const { templates } = req.body || {};
      const list = Array.isArray(templates)
        ? templates
            .map((t) => ({
              name: String(t?.name ?? "").trim(),
              isDefault: !!t?.isDefault,
            }))
            .filter((t) => t.name.length > 0)
        : [];

      await col.updateOne(
        query,
        { $set: { "n11.shipmentTemplates": list, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date(), ...query } },
        { upsert: true }
      );

      return res.status(200).json({ success: true, message: "Şablonlar kaydedildi", templates: list });
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (err) {
    if (err.name === "JsonWebTokenError") return res.status(401).json({ success: false, message: "Geçersiz token" });
    console.error("[n11/shipment-templates]", err);
    return res.status(500).json({ success: false, message: err?.message || "Sunucu hatası" });
  }
}
