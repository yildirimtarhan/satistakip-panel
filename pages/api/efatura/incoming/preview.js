// 📁 /api/efatura/incoming/preview – Gelen fatura önizleme (PDF URL veya base64)
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ message: "Sadece GET" });

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
    const userId = String(decoded.userId || decoded._id || decoded.id || "");
    const companyId = decoded.companyId ? String(decoded.companyId) : null;
    const id = req.query.id;
    if (!id) return res.status(400).json({ message: "id gerekli" });

    const { db } = await connectToDatabase();
    const col = db.collection("efatura_incoming");
    const doc = await col.findOne({
      _id: new ObjectId(id),
      $or: [{ userId }, { companyId: companyId || "" }],
    });
    if (!doc) return res.status(404).json({ message: "Fatura bulunamadı" });

    return res.status(200).json({
      pdfUrl: doc.pdfUrl || null,
      pdfBase64: doc.pdfBase64 || null,
      invoiceNo: doc.invoiceNo || doc.faturaNo,
      senderTitle: doc.senderTitle || doc.gonderen,
    });
  } catch (err) {
    console.error("incoming/preview:", err);
    return res.status(500).json({ message: err.message || "Sunucu hatası" });
  }
}
