// 📁 /api/efatura/incoming/return – Gelen faturayı İade Et (Taxten tarzı)
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import axios from "axios";

function getTaxtenAuth(company) {
  const useClientId = company.efatura?.taxtenClientId && company.efatura?.taxtenApiKey;
  const headers = { "Content-Type": "application/json" };
  if (useClientId) {
    headers["x-client-id"] = company.efatura.taxtenClientId;
    headers["x-api-key"] = company.efatura.taxtenApiKey;
  } else if (company.taxtenUsername && company.taxtenPassword) {
    headers.Authorization = `Basic ${Buffer.from(`${company.taxtenUsername}:${company.taxtenPassword}`).toString("base64")}`;
  } else return null;
  return headers;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Sadece POST" });

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

    const { ids } = req.body || {};
    const idList = Array.isArray(ids) ? ids : ids ? [ids] : [];
    if (!idList.length) return res.status(400).json({ message: "ids (dizi) gerekli" });

    const { db } = await connectToDatabase();
    const companyQuery = companyId ? { $or: [{ companyId }, { userId }] } : { userId };
    const company = await db.collection("company_settings").findOne(companyQuery);
    if (!company) return res.status(400).json({ message: "Firma ayarları bulunamadı" });

    const col = db.collection("efatura_incoming");
    const isTestMode = company.taxtenTestMode !== false;
    const baseUrl = isTestMode ? "https://devrest.taxten.com/api/v1" : "https://rest.taxten.com/api/v1";
    const headers = getTaxtenAuth(company);
    if (!headers) return res.status(400).json({ message: "Taxten API bilgisi firma ayarlarında yok" });

    const results = { success: [], failed: [] };
    for (const id of idList) {
      let doc;
      try {
        doc = await col.findOne({ _id: new ObjectId(id), $or: [{ userId }, { companyId: companyId || "" }] });
      } catch {
        results.failed.push({ id, error: "Geçersiz ID" });
        continue;
      }
      if (!doc) {
        results.failed.push({ id, error: "Fatura bulunamadı" });
        continue;
      }
      const ettn = doc.ettn || doc.uuid || doc._id?.toString();
      try {
        const response = await axios.post(
          `${baseUrl}/Invoice/Inbound/CreateReturn`,
          { ettn, id: ettn, invoiceId: id },
          { headers, timeout: 15000, validateStatus: () => true }
        );
        if (response.status >= 200 && response.status < 300) {
          await col.updateOne(
            { _id: doc._id },
            { $set: { returnStatus: "returned", returnedAt: new Date() } }
          );
          results.success.push(id);
        } else {
          results.failed.push({ id, error: response.data?.message || response.data?.Message || `HTTP ${response.status}` });
        }
      } catch (err) {
        const msg = err.response?.data?.message || err.response?.data?.Message || err.message;
        if (err.response?.status === 404 || msg?.toLowerCase?.().includes("not found")) {
          await col.updateOne(
            { _id: doc._id },
            { $set: { returnStatus: "returned", returnedAt: new Date() } }
          );
          results.success.push(id);
        } else {
          results.failed.push({ id, error: msg });
        }
      }
    }

    return res.status(200).json({
      message: `${results.success.length} fatura için İade işlemi başlatıldı.`,
      success: results.success,
      failed: results.failed,
    });
  } catch (err) {
    console.error("incoming/return:", err);
    return res.status(500).json({ message: err.message || "Sunucu hatası" });
  }
}
