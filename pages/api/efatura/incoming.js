// 📁 /pages/api/efatura/incoming.js – Gelen e-faturalar listesi
import { connectToDatabase } from "@/lib/mongodb";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET" });
  }

  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Token gerekli" });
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Geçersiz token" });
    }

    const { db } = await connectToDatabase();
    const col = db.collection("efatura_incoming");
    const userIdStr = String(decoded.userId || "");
    const companyIdStr = decoded.companyId ? String(decoded.companyId) : null;
    const query = companyIdStr
      ? { companyId: companyIdStr }
      : { userId: userIdStr };

    // Tarih filtresi (Taxten tarzı: startDate, endDate)
    const { startDate, endDate, q } = req.query;
    if (startDate || endDate) {
      query.receivedAt = {};
      if (startDate) query.receivedAt.$gte = new Date(startDate);
      if (endDate) query.receivedAt.$lte = new Date(endDate);
    }
    if (q && String(q).trim()) {
      const term = String(q).trim();
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { invoiceNo: new RegExp(term, "i") },
          { faturaNo: new RegExp(term, "i") },
          { senderTitle: new RegExp(term, "i") },
          { gonderen: new RegExp(term, "i") },
        ],
      });
    }

    const list = await col
      .find(query)
      .sort({ receivedAt: -1, createdAt: -1 })
      .toArray();

    return res.status(200).json(list);
  } catch (err) {
    console.error("E-Fatura incoming:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
