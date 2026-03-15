/**
 * Taxten getUBLList - Gelen/Gönderilen UBL belge listesi
 * GET /Invoice/getUBLList
 */
import { connectToDatabase } from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import { getUBLList } from "@/lib/taxten/taxtenClient";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ message: "Sadece GET" });

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
    return res.status(400).json({ error: "Taxten API bilgisi yok. Firma ayarlarını kontrol edin." });
  }

  const {
    type = "OUTBOUND",
    docType = "INVOICE",
    identifier,
    page = "1",
    pageSize = "10",
    startDate,
    endDate,
    uuid,
  } = req.query || {};

  try {
    const opts = {
      company,
      isTest: company.taxtenTestMode !== false,
      Identifier: identifier || company.senderIdentifier || `urn:mail:${company.taxtenUsername || company.vergiNo}`,
      VKN_TCKN: company.vergiNo || company.vkn || "",
      DocType: docType,
      Type: type,
      Page: parseInt(page, 10) || 1,
      PageSize: parseInt(pageSize, 10) || 10,
    };
    if (startDate) opts.StartDate = startDate;
    if (endDate) opts.EndDate = endDate;
    if (uuid) opts.UUID = Array.isArray(uuid) ? uuid : [uuid];

    const data = await getUBLList(opts);
    return res.status(200).json(data);
  } catch (err) {
    console.error("[Taxten] getUBLList:", err.response?.data || err.message);
    return res.status(502).json({
      error: "Taxten API hatası",
      message: err.response?.data?.message || err.message,
    });
  }
}
