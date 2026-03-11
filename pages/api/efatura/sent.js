// 📁 /pages/api/efatura/sent.js
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  try {
    const { db } = await connectToDatabase();
    const sent = db.collection("efatura_sent");

    // 🔐 Kullanıcı doğrulama
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return res.status(401).json({ message: "Token eksik" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Token geçersiz" });
    }

    const userIdStr = String(decoded.userId || decoded._id || decoded.id || "");
    const companyIdStr = decoded.companyId ? String(decoded.companyId) : null;
    
    // Multi-tenant sorgusu
    const tenantFilter = companyIdStr 
      ? { companyId: companyIdStr } 
      : { userId: userIdStr };

    // ============================
    // 📌 GET → Gönderilmiş Faturaları Listele
    // ============================
    if (req.method === "GET") {
      const list = await sent
        .find(tenantFilter)
        .sort({ sentAt: -1 })
        .toArray();

      return res.status(200).json(list);
    }

    // ============================
    // 📌 DELETE → Gönderilmiş Fatura Sil
    // /api/efatura/sent?id=<id>
    // ============================
    if (req.method === "DELETE") {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ message: "id eksik" });
      }

      let oid;
      try {
        oid = new ObjectId(id);
      } catch {
        return res.status(400).json({ message: "Geçersiz id" });
      }

      const delResult = await sent.deleteOne({ _id: oid, ...tenantFilter });
      
      if (delResult.deletedCount === 0) {
        return res.status(404).json({ message: "Fatura bulunamadı veya silme yetkiniz yok" });
      }
      
      return res.status(200).json({ message: "Fatura silindi" });
    }

    return res
      .status(405)
      .json({ message: "Sadece GET ve DELETE desteklenir" });
  } catch (err) {
    console.error("📌 E-Fatura SENT API Hatası:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
