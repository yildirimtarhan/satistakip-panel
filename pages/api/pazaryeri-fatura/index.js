/**
 * Pazaryeri Fatura Ekle – PDF yükleme ve listeleme
 * GET: Kullanıcının yüklediği faturalar
 * POST: marketplace, orderNumber, pdf (base64) kaydet
 */
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/mongodb";

const MAX_PDF_SIZE = 5 * 1024 * 1024; // 5MB

function getToken(req) {
  const auth = req.headers.authorization;
  if (auth && /^Bearer\s+/i.test(auth)) return auth.replace(/^Bearer\s+/i, "").trim();
  return null;
}

export default async function handler(req, res) {
  try {
    const token = getToken(req);
    if (!token || !process.env.JWT_SECRET) {
      return res.status(401).json({ message: "Token gerekli" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = String(decoded.userId || decoded._id || "");
    const companyId = decoded.companyId ? String(decoded.companyId) : null;

    const { db } = await connectToDatabase();
    const col = db.collection("pazaryeri_faturalar");

    if (req.method === "GET") {
      const { orderNumber, marketplace } = req.query || {};
      if (orderNumber && marketplace) {
        const one = await col.findOne(
          { userId, orderNumber: String(orderNumber).trim(), marketplace: String(marketplace).trim() },
          { projection: { pdf: 0 } }
        );
        return res.status(200).json({ success: true, invoice: one });
      }
      const list = await col
        .find({ userId })
        .sort({ createdAt: -1 })
        .project({ pdf: 0 })
        .limit(100)
        .toArray();
      return res.status(200).json({ success: true, list });
    }

    if (req.method === "POST") {
      const { marketplace, orderNumber, pdf } = req.body || {};
      if (!marketplace || !orderNumber || !pdf) {
        return res.status(400).json({ message: "marketplace, orderNumber ve pdf (base64) gerekli" });
      }
      const m = String(pdf).match(/^data:application\/pdf;base64,(.+)$/);
      const base64 = m ? m[1] : (pdf.startsWith("base64,") ? pdf.slice(7) : pdf);
      const buf = Buffer.from(base64, "base64");
      if (buf.length > MAX_PDF_SIZE) {
        return res.status(400).json({ message: "PDF en fazla 5MB olabilir" });
      }
      const now = new Date();
      const filter = { userId, marketplace: String(marketplace).trim(), orderNumber: String(orderNumber).trim() };
      const update = { $set: { pdf: base64, updatedAt: now }, $setOnInsert: { companyId: companyId || null, createdAt: now } };
      const result = await col.findOneAndUpdate(filter, update, { upsert: true, returnDocument: "after" });
      const doc = result?.value || result;
      return res.status(200).json({
        success: true,
        message: doc?.updatedAt ? "Fatura güncellendi" : "Fatura yüklendi",
        id: doc?._id?.toString?.() || null,
      });
    }

    return res.status(405).json({ message: "Sadece GET veya POST" });
  } catch (err) {
    if (err.name === "JsonWebTokenError") return res.status(401).json({ message: "Geçersiz token" });
    console.error("pazaryeri-fatura:", err);
    return res.status(500).json({ message: err.message || "Sunucu hatası" });
  }
}
