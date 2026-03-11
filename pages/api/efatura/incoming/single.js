// GET /api/efatura/incoming/single?id=... – Tek gelen fatura
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ message: "Sadece GET" });
  const id = req.query.id;
  if (!id) return res.status(400).json({ message: "id gerekli" });

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

    const { db } = await connectToDatabase();
    const col = db.collection("efatura_incoming");
    
    // Multi-tenant sorgusu
    const tenantFilter = companyId 
      ? { companyId: companyId } 
      : { userId: userId };
      
    const query = { _id: new ObjectId(id), ...tenantFilter };
    const doc = await col.findOne(query);
    if (!doc) return res.status(404).json({ message: "Fatura bulunamadı veya yetkiniz yok" });
    doc._id = doc._id.toString();
    return res.status(200).json(doc);
  } catch (err) {
    console.error("incoming/single:", err);
    return res.status(500).json({ message: err.message || "Sunucu hatası" });
  }
}
