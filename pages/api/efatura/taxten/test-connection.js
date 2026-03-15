// Taxten API bağlantı testi
import { connectToDatabase } from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import { getCreditBalance } from "@/lib/taxten/taxtenClient";
import { getUBLList } from "@/lib/taxten/taxtenClient";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ message: "Sadece GET veya POST" });
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

    const { db } = await connectToDatabase();
    const userIdStr = String(decoded.userId || decoded._id || decoded.id || "");
    const companyIdStr = decoded.companyId ? String(decoded.companyId) : null;

    const companyQuery = companyIdStr
      ? { $or: [{ companyId: companyIdStr }, { userId: userIdStr }] }
      : { userId: userIdStr };
    const company = await db.collection("company_settings").findOne(companyQuery);

    if (!company) {
      return res.status(400).json({
        ok: false,
        message: "Firma ayarları bulunamadı. Taxten bilgilerini girip kaydedin.",
      });
    }

    const hasCreds =
      (company.taxtenClientId && company.taxtenApiKey) ||
      (company.efatura?.taxtenClientId && company.efatura?.taxtenApiKey) ||
      (company.taxtenUsername && company.taxtenPassword);

    if (!hasCreds) {
      return res.status(400).json({
        ok: false,
        message: "Taxten Client ID + API Key veya Kullanıcı adı + Şifre girin.",
      });
    }

    const isTest = company.taxtenTestMode !== false;
    const ortam = isTest ? "Test (devrest.taxten.com)" : "Canlı (rest.taxten.com)";

    try {
      // 1) Önce kontör/credit endpoint dene
      const credit = await getCreditBalance({ company, isTest });
      if (credit && (credit.remaining != null || credit.total != null || credit.balance != null)) {
        return res.status(200).json({
          ok: true,
          message: `Bağlantı başarılı (${ortam})`,
          ortam,
          credit: credit.remaining ?? credit.total ?? credit.balance,
        });
      }
    } catch (e1) {
      // Kontör endpoint yoksa getUBLList ile dene
      try {
        const identifier = company.senderIdentifier || `urn:mail:${company.taxtenUsername || company.vergiNo || ""}`;
        await getUBLList({
          company,
          isTest,
          Identifier: identifier,
          VKN_TCKN: company.vergiNo || company.vkn || "",
          DocType: "INVOICE",
          Type: "OUTBOUND",
          PageSize: 1,
        });
        return res.status(200).json({
          ok: true,
          message: `Bağlantı başarılı (${ortam})`,
          ortam,
        });
      } catch (e2) {
        const msg = e1?.response?.data?.message || e1?.message || "Bilinmeyen hata";
        return res.status(502).json({
          ok: false,
          message: `Taxten API hatası: ${msg}`,
          ortam,
        });
      }
    }

    return res.status(200).json({
      ok: true,
      message: `Bağlantı başarılı (${ortam})`,
      ortam,
    });
  } catch (err) {
    console.error("Taxten test:", err);
    return res.status(500).json({
      ok: false,
      message: err?.message || "Sunucu hatası",
    });
  }
}
