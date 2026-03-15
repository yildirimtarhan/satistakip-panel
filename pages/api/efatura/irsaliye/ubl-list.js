/**
 * E-İrsaliye belge listesi (Taxten GetUblList)
 * GET /api/efatura/irsaliye/ubl-list
 */
import { connectToDatabase } from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import { despatchGetUblList } from "@/lib/taxten/taxtenClient";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ message: "Sadece GET" });

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
    const companyId = decoded.companyId ? String(decoded.companyId) : null;
    const companyQuery = companyId ? { $or: [{ companyId }, { userId: String(decoded.userId) }] } : { userId: String(decoded.userId) };
    const company = await db.collection("company_settings").findOne(companyQuery);

    if (!company || (!company.efatura?.taxtenClientId && !company.taxtenUsername)) {
      return res.status(400).json({ message: "Taxten API bilgisi yok." });
    }

    const { type = "OUTBOUND", docType = "DESPATCH", fromDate, toDate, uuid } = req.query || {};
    const opts = {
      company,
      isTest: company.taxtenTestMode !== false,
      DocType: docType,
      Type: type,
    };
    if (fromDate) opts.FromDate = fromDate;
    if (toDate) opts.ToDate = toDate;
    if (uuid) opts.UUID = Array.isArray(uuid) ? uuid : [uuid];

    const data = await despatchGetUblList(opts);
    return res.status(200).json(data);
  } catch (err) {
    console.error("E-İrsaliye GetUblList:", err.response?.data || err.message);
    return res.status(502).json({
      error: "Taxten API hatası",
      message: err.response?.data?.message || err.message,
    });
  }
}
