/**
 * POST /api/efatura/sync-taxten-belgeler
 * Taxten panelinden gelen/giden fatura ve irsaliye listesini ERP kullanıcı bilgisine göre çeker ve DB’ye yazar.
 */
import { connectToDatabase } from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import { syncTaxtenBelgelerForUser } from "@/lib/efatura/syncTaxtenBelgeler";

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

    const userId = String(decoded.userId || decoded._id || decoded.id || "");
    const companyId = decoded.companyId ? String(decoded.companyId) : null;

    const { db } = await connectToDatabase();
    const companyQuery = companyId
      ? { $or: [{ companyId }, { userId }] }
      : { userId };
    const company = await db.collection("company_settings").findOne(companyQuery);

    if (!company) {
      return res.status(400).json({
        success: false,
        message: "Firma ayarları bulunamadı. Taxten bilgilerini kontrol edin.",
      });
    }

    const hasTaxten =
      (company.efatura?.taxtenClientId && company.efatura?.taxtenApiKey) ||
      (company.taxtenUsername && company.taxtenPassword);
    if (!hasTaxten) {
      return res.status(400).json({
        success: false,
        message: "Taxten API bilgisi yok. Firma ayarlarında Taxten kullanıcı adı/şifre veya Client ID + API Key tanımlayın.",
      });
    }

    const result = await syncTaxtenBelgelerForUser({
      db,
      company,
      userId,
      companyId,
    });

    if (result.errors.length) {
      return res.status(200).json({
        success: true,
        message: "Kısmen tamamlandı; bazı hatalar oluştu.",
        ...result,
        debug: result.debug,
      });
    }

    const total = (result.sent || 0) + (result.incoming || 0) + (result.irsaliyeSent || 0) + (result.irsaliyeIncoming || 0);
    return res.status(200).json({
      success: true,
      message: total === 0 && result.debug
        ? "Taxten'den bu hesap için kayıt dönmedi. Firma Identifier/VKN ve test/canlı ortamını kontrol edin. Detay: " + JSON.stringify(result.debug)
        : "Taxten gelen/giden fatura ve irsaliye listesi senkronize edildi.",
      ...result,
      debug: result.debug,
    });
  } catch (err) {
    console.error("[sync-taxten-belgeler]", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Sunucu hatası",
    });
  }
}
