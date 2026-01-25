import dbConnect from "@/lib/mongodb";
import Cari from "@/models/Cari"; // ✅ senin Cari modelinin yolu buysa kalsın, değilse düzelt
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    await dbConnect();

    // ✅ TOKEN: Authorization header veya cookie içinden al
    const authHeader = req.headers.authorization || "";
    const tokenFromHeader = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    const tokenFromCookie = req.cookies?.token || null;

    const token = tokenFromHeader || tokenFromCookie;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token bulunamadı. Lütfen tekrar giriş yap.",
      });
    }

    // ✅ JWT decode
    let decoded = null;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Token geçersiz veya süresi dolmuş.",
      });
    }

    const userId = decoded?.userId;
    const companyId = decoded?.companyId;

    if (!userId || !companyId) {
      return res.status(400).json({
        success: false,
        message: "Token içinde userId/companyId eksik.",
      });
    }

    // ✅ request body
    const { email, phone, fullName } = req.body || {};

    // boş request gelirse hata dön (400 fix)
    if (!email && !phone && !fullName) {
      return res.status(400).json({
        success: false,
        message: "Arama için email / phone / fullName alanlarından en az biri gerekli.",
      });
    }

    // ✅ Multi-tenant filtre
    const query = {
      companyId,
      $or: [],
    };

    if (email && String(email).trim().length > 2) {
      query.$or.push({ email: String(email).trim().toLowerCase() });
    }

    if (phone && String(phone).trim().length > 3) {
      query.$or.push({
        telefon: { $regex: String(phone).trim(), $options: "i" },
      });
    }

    if (fullName && String(fullName).trim().length > 2) {
      query.$or.push({
        ad: { $regex: String(fullName).trim(), $options: "i" },
      });
    }

    // hiç or yoksa
    if (query.$or.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Arama kriterleri geçersiz.",
      });
    }

    const results = await Cari.find(query)
      .select("_id ad email telefon vergiNo tcNo") // panelde göstereceğimiz alanlar
      .limit(20)
      .lean();

    return res.status(200).json({
      success: true,
      results,
      count: results.length,
    });
  } catch (err) {
    console.error("CARI SEARCH ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Cari arama sırasında hata oluştu.",
      error: err?.message || String(err),
    });
  }
}
