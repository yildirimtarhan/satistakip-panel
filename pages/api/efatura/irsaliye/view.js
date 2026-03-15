/**
 * E-İrsaliye belge görüntüsü (HTML/PDF)
 * POST /api/efatura/irsaliye/view
 */
import { connectToDatabase } from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import { despatchGetView } from "@/lib/taxten/taxtenClient";

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

    const { uuid, id, custDesId, type = "OUTBOUND", viewType = "PDF", docType = "DESPATCH" } = req.body || {};
    if (!uuid && !id && !custDesId) return res.status(400).json({ message: "uuid, id veya custDesId gerekli" });

    const data = await despatchGetView({
      company,
      isTest: company.taxtenTestMode !== false,
      UUID: uuid,
      ID: id,
      CustDesID: custDesId,
      Type: type,
      ViewType: viewType,
      DocType: docType,
    });

    return res.status(200).json(data);
  } catch (err) {
    console.error("E-İrsaliye View:", err.response?.data || err.message);
    return res.status(502).json({
      error: "Taxten API hatası",
      message: err.response?.data?.message || err.message,
    });
  }
}
