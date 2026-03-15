/**
 * Taxten getUBL - Belge (UBL XML) indirme
 * POST /Invoice/getUBL
 */
import { connectToDatabase } from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import { getUBL } from "@/lib/taxten/taxtenClient";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Sadece POST" });

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token gerekli" });
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Geçersiz token" });
  }

  const { db } = await connectToDatabase();
  const companyId = decoded.companyId ? String(decoded.companyId) : null;
  const userId = String(decoded.userId || "");
  const companyQuery = companyId ? { $or: [{ companyId }, { userId }] } : { userId };
  const company = await db.collection("company_settings").findOne(companyQuery);
  if (!company || (!company.efatura?.taxtenClientId && !company.taxtenUsername)) {
    return res.status(400).json({ error: "Taxten API bilgisi yok." });
  }

  const { uuid, uuids, docType = "INVOICE", type = "OUTBOUND", isZip = true } = req.body || {};
  const uuidList = Array.isArray(uuids) ? uuids : uuid ? [uuid] : [];
  if (uuidList.length === 0) {
    return res.status(400).json({ error: "uuid veya uuids gerekli." });
  }
  if (uuidList.length > 20) {
    return res.status(400).json({ error: "Tek seferde en fazla 20 UUID indirilebilir." });
  }

  try {
    const data = await getUBL({
      company,
      isTest: company.taxtenTestMode !== false,
      Identifier: company.senderIdentifier || `urn:mail:${company.taxtenUsername || company.vergiNo}`,
      VKN_TCKN: company.vergiNo || company.vkn || "",
      UUID: uuidList,
      DocType: docType,
      Type: type,
      IsZip: isZip,
    });
    return res.status(200).json(data);
  } catch (err) {
    console.error("[Taxten] getUBL:", err.response?.data || err.message);
    return res.status(502).json({
      error: "Taxten API hatası",
      message: err.response?.data?.message || err.message,
    });
  }
}
