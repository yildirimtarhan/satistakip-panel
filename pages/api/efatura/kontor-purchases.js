// 📁 pages/api/efatura/kontor-purchases.js
// Kontör alımları (yüklemeler) – Taxten panelden manuel girilen veya senkronize edilen
import { connectToDatabase } from "@/lib/mongodb";
import jwt from "jsonwebtoken";

const COL = "efatura_kontor_purchases";

export default async function handler(req, res) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
    if (!token) return res.status(401).json({ message: "Token eksik" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Token geçersiz" });
    }

    const userIdStr = String(decoded.userId || decoded._id || decoded.id || "");
    const companyIdStr = decoded.companyId ? String(decoded.companyId) : null;
    const tenantFilter = companyIdStr ? { companyId: companyIdStr } : { userId: userIdStr };

    const { db } = await connectToDatabase();
    const col = db.collection(COL);

    if (req.method === "GET") {
      const list = await col.find(tenantFilter).sort({ purchasedAt: -1 }).limit(100).toArray();
      return res.status(200).json(list);
    }

    if (req.method === "POST") {
      // Sadece admin kontör ekleyebilir
      if (decoded.role !== "admin") {
        return res.status(403).json({ message: "Kontör ekleme yetkisi yok. Sadece admin ekleyebilir." });
      }
      const { amount, note = "", source = "manual" } = req.body || {};
      const amt = parseInt(amount, 10);
      if (!amount || amt <= 0) {
        return res.status(400).json({ message: "Geçerli miktar girin" });
      }
      const doc = {
        ...tenantFilter,
        amount: amt,
        note: String(note).trim(),
        source: ["taxten_panel", "manual"].includes(source) ? source : "manual",
        purchasedAt: new Date(),
        createdAt: new Date(),
      };
      await col.insertOne(doc);
      return res.status(201).json({ message: "Alım kaydedildi", purchase: doc });
    }

    return res.status(405).json({ message: "Sadece GET ve POST" });
  } catch (err) {
    console.error("Kontör alımları API:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
