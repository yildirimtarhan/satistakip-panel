// pages/api/teklif/olustur.js
import jwt from "jsonwebtoken";
import dbConnect, { connectToDatabase } from "../../../lib/mongodb";
import Teklif from "../../../models/Teklif";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST desteklenir" });
  }

  try {
    // 1) DB connect
    await dbConnect();

    // 2) Token kontrol
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Token yok" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ message: "Token geçersiz" });
    }

    const userId = decoded?.userId;
    if (!userId) return res.status(401).json({ message: "UserId bulunamadı" });

    // 3) Body al
    const {
      cariId,
      cariName,
      not,
      currency,
      number, // ✅ Frontend'den gönderiyorsun: number: offerNumber
      lines,
    } = req.body || {};

    // 4) Validasyon
    if (!cariId) return res.status(400).json({ message: "Cari seçiniz." });
    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ message: "Ürün/Hizmet kalemleri boş olamaz" });
    }

    // boş satırları ele
    const cleanedLines = lines
      .map((l) => ({
        urunId: l.urunId || l.productId || "",
        urunAd: l.urunAd || l.name || "",
        adet: Number(l.adet ?? 0),
        fiyat: Number(l.fiyat ?? 0),
        kdv: Number(l.kdv ?? 0),
      }))
      .filter((l) => (l.urunId || l.urunAd) && l.adet > 0);

    if (cleanedLines.length === 0) {
      return res.status(400).json({ message: "Ürün/Hizmet kalemleri boş olamaz" });
    }

    // 5) Totals (server tarafı güvenli hesap)
    const araToplam = cleanedLines.reduce((t, l) => t + l.adet * l.fiyat, 0);
    const kdvToplam = cleanedLines.reduce((t, l) => {
      const satir = l.adet * l.fiyat;
      return t + (satir * (l.kdv || 0)) / 100;
    }, 0);
    const genelToplam = araToplam + kdvToplam;

    // 6) Multi-tenant firma bilgisi: token userId → company_settings
    // company api driver ile çalışıyor; biz direkt collection'dan çekiyoruz.
    const { db } = await connectToDatabase();
    const companySettings = await db
      .collection("company_settings")
      .findOne({ userId });

    const companyName = companySettings?.firmaAdi || companySettings?.yetkili || "Firma";
    const companyEmail = companySettings?.eposta || process.env.SMTP_FROM_EMAIL || "";

    // 7) Kaydet
    const teklif = await Teklif.create({
      userId,
      cariId,
      cariName: cariName || "",

      number: number || null, // ✅ offer number
      currency: currency || "TL",
      not: not || "",

      lines: cleanedLines,

      araToplam,
      kdvToplam,
      genelToplam,

      companyName,
      companyEmail,

      status: "kaydedildi", // ✅ enum uyumlu

      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return res.status(201).json({
      message: "Teklif oluşturuldu",
      teklif,
      teklifId: teklif?._id,
    });
  } catch (err) {
    console.error("❌ /api/teklif/olustur hata:", err);
    return res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
}
