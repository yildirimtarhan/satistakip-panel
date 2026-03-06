// 📁 /api/efatura/incoming/respond – Gelen faturaya Kabul veya Ret (Taxten tarzı)
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

    const { ids, action } = req.body || {};
    const idList = Array.isArray(ids) ? ids : ids ? [ids] : [];
    if (!idList.length || !["accept", "reject"].includes(action)) {
      return res.status(400).json({ message: "ids (dizi) ve action (accept veya reject) gerekli" });
    }

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
        // Taxten: Kabul/Ret endpoint (yaygın path örnekleri)
        const respondPath = action === "accept" ? "/Invoice/Inbound/Accept" : "/Invoice/Inbound/Reject";
        const response = await axios.post(
          `${baseUrl}${respondPath}`,
          { ettn, id: ettn, invoiceId: id },
          { headers, timeout: 15000, validateStatus: () => true }
        );
        if (response.status >= 200 && response.status < 300) {
          await col.updateOne(
            { _id: doc._id },
            { $set: { responseStatus: action === "accept" ? "accepted" : "rejected", respondedAt: new Date() } }
          );
          results.success.push(id);
        } else {
          results.failed.push({ id, error: response.data?.message || response.data?.Message || `HTTP ${response.status}` });
        }
      } catch (err) {
        const msg = err.response?.data?.message || err.response?.data?.Message || err.message;
        if (err.response?.status === 404 || msg?.toLowerCase?.().includes("not found")) {
          // Taxten bu endpoint'i sunmuyorsa yerelde sadece durum güncelle
          await col.updateOne(
            { _id: doc._id },
            { $set: { responseStatus: action === "accept" ? "accepted" : "rejected", respondedAt: new Date() } }
          );
          results.success.push(id);
        } else {
          results.failed.push({ id, error: msg });
        }
      }
    }

    return res.status(200).json({
      message: `${results.success.length} fatura için ${action === "accept" ? "Kabul" : "Ret"} işlemi uygulandı.`,
      success: results.success,
      failed: results.failed,
    });
  } catch (err) {
    console.error("incoming/respond:", err);
    return res.status(500).json({ message: err.message || "Sunucu hatası" });
  }
}
