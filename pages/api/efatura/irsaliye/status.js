/**
 * E-İrsaliye zarf durum sorgulama
 * POST /api/efatura/irsaliye/status
 */
import { connectToDatabase } from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import { despatchGetStatus } from "@/lib/taxten/taxtenClient";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Sadece POST" });

  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ message: "Token gerekli" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Geçersiz token" });
    }

    const { db } = await connectToDatabase();
    const companyQuery = decoded.companyId
      ? { $or: [{ companyId: String(decoded.companyId) }, { userId: String(decoded.userId) }] }
      : { userId: String(decoded.userId) };
    const company = await db.collection("company_settings").findOne(companyQuery);

    if (!company) return res.status(400).json({ message: "Firma ayarları bulunamadı" });

    const { uuid, uuids } = req.body || {};
    const uuidList = Array.isArray(uuids) ? uuids : uuid ? [uuid] : [];
    if (uuidList.length === 0) return res.status(400).json({ message: "uuid veya uuids gerekli" });
    if (uuidList.length > 20) return res.status(400).json({ message: "En fazla 20 UUID" });

    const data = await despatchGetStatus({
      company,
      isTest: company.taxtenTestMode !== false,
      UUID: uuidList,
    });

    return res.status(200).json(data);
  } catch (err) {
    console.error("E-İrsaliye Status:", err.response?.data || err.message);
    return res.status(502).json({
      error: "Taxten API hatası",
      message: err.response?.data?.message || err.message,
    });
  }
}
