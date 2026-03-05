// POST /api/efatura/sync-taxten-drafts – Taxten portalındaki taslakları bizim sisteme çeker
import { connectToDatabase } from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import { fetchTaxtenDrafts, mapTaxtenDraftToOurs } from "@/lib/taxten/fetchDrafts";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST" });
  }

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
    const userId = String(decoded.userId || "");
    const companyId = decoded.companyId ? String(decoded.companyId) : null;

    const { db } = await connectToDatabase();
    const companyQuery = companyId
      ? { $or: [{ companyId }, { userId }] }
      : { userId };
    const company = await db.collection("company_settings").findOne(companyQuery);
    if (!company) {
      return res.status(400).json({
        message: "Firma ayarları bulunamadı. E-Fatura başvurusu ve Taxten bilgilerini kontrol edin.",
      });
    }

    const useClientId = company.efatura?.taxtenClientId && company.efatura?.taxtenApiKey;
    const headers = { "Content-Type": "application/json" };
    if (useClientId) {
      headers["x-client-id"] = company.efatura.taxtenClientId;
      headers["x-api-key"] = company.efatura.taxtenApiKey;
    } else if (company.taxtenUsername && company.taxtenPassword) {
      headers.Authorization = `Basic ${Buffer.from(`${company.taxtenUsername}:${company.taxtenPassword}`).toString("base64")}`;
    } else {
      return res.status(400).json({
        message: "Taxten API bilgisi yok. Firma ayarlarında Taxten kullanıcı adı/şifre veya ClientId+ApiKey tanımlayın.",
      });
    }

    const isTestMode = company.taxtenTestMode !== false;
    const baseUrl = isTestMode
      ? "https://devrest.taxten.com/api/v1"
      : "https://rest.taxten.com/api/v1";

    let taxtenList = [];
    try {
      taxtenList = await fetchTaxtenDrafts({ baseUrl, headers });
    } catch (err) {
      console.error("Taxten taslak listesi alınamadı:", err);
      return res.status(502).json({
        success: false,
        synced: 0,
        message:
          "Taxten taslak listesi alınamadı. Taxten API'nin 'Taslak Listele' endpoint'ini desteklediğinden ve path'in doğru olduğundan emin olun. Hata: " +
          (err.message || "Bilinmeyen"),
      });
    }

    const col = db.collection("efatura_drafts");
    let synced = 0;
    for (const item of taxtenList) {
      const mapped = mapTaxtenDraftToOurs(item);
      const ettn = mapped.taxtenEttn || mapped.uuid;
      const doc = {
        userId,
        ...mapped,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = await col.updateOne(
        { userId, taxtenEttn: ettn },
        { $set: doc },
        { upsert: true }
      );
      if (result.upsertedCount || result.modifiedCount) synced++;
    }

    return res.status(200).json({
      success: true,
      synced,
      total: taxtenList.length,
      message:
        taxtenList.length === 0
          ? "Taxten'de taslak bulunamadı veya API farklı formatta dönüyor."
          : `${synced} taslak senkronize edildi.`,
    });
  } catch (err) {
    console.error("sync-taxten-drafts:", err);
    return res.status(500).json({
      success: false,
      synced: 0,
      message: err.message || "Senkronizasyon hatası",
    });
  }
}
