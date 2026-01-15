// pages/api/teklif/save.js

import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import dbConnect from "@/lib/mongodb";
import Teklif from "@/models/Teklif";

// 🔥 PDF base64 için body limit artırımı (413 FIX)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

// ☁️ Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await dbConnect();

    /* ───────── AUTH ───────── */
    const token =
      req.headers.authorization?.split(" ")[1] ||
      req.body.token ||
      req.query.token;

    if (!token) {
      return res.status(401).json({ message: "Yetkisiz (token yok)" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Geçersiz token" });
    }

    const userId = decoded.userId;
    const companyId = decoded.companyId || null;

    /* ───────── BODY ───────── */
    const {
      pdfBase64,
      fileName,

      teklifId, // varsa update için
      cariId,
      cariAdi,

      lines,
      note,
      totals,
      currency,
    } = req.body || {};

    if (!pdfBase64 || !fileName) {
      return res.status(400).json({
        message: "pdfBase64 veya fileName eksik",
      });
    }

    // ✅ LINES normalize (boş gelirse patlamasın)
    const safeLines = Array.isArray(lines) ? lines : [];

    // ✅ hesaplar (model zorunluları)
    const araToplam = safeLines.reduce((acc, l) => {
      const adet = Number(l.adet || 0);
      const fiyat = Number(l.fiyat || 0);
      return acc + adet * fiyat;
    }, 0);

    const kdvToplam = safeLines.reduce((acc, l) => {
      const adet = Number(l.adet || 0);
      const fiyat = Number(l.fiyat || 0);
      const kdv = Number(l.kdv ?? 20);
      const satirToplam = adet * fiyat;
      return acc + (satirToplam * kdv) / 100;
    }, 0);

    const genelToplam = araToplam + kdvToplam;

    /* ───────── PDF → CLOUDINARY ───────── */
    const cleanBase64 = pdfBase64.replace(
      /^data:application\/pdf;base64,/,
      ""
    );

    const uploadResult = await cloudinary.uploader.upload(
      `data:application/pdf;base64,${cleanBase64}`,
      {
        folder: "teklifler",
        resource_type: "raw",
        public_id: fileName.replace(".pdf", ""),
        overwrite: true,
      }
    );

    const pdfUrl = uploadResult.secure_url;

    /* ───────── DB SAVE / UPDATE ───────── */
    let teklif;

    if (teklifId) {
      // 🔁 VAR OLAN TEKLİFİ GÜNCELLE
      teklif = await Teklif.findOneAndUpdate(
        { _id: teklifId, userId },
        {
          $set: {
            cariId,
            cariAdi,

            lines: safeLines,
            note,
            totals,
            currency,

            // ✅ model required alanları
            araToplam,
            kdvToplam,
            genelToplam,

            pdfUrl, // ⭐⭐⭐
            status: "Kaydedildi",
            updatedAt: new Date(),
          },
        },
        { new: true }
      );
    } else {
      // 🆕 YENİ TEKLİF OLUŞTUR
      teklif = await Teklif.create({
        userId,
        companyId,

        cariId,
        cariAdi,

        lines: safeLines,
        note,
        totals,
        currency,

        // ✅ model required alanları
        araToplam,
        kdvToplam,
        genelToplam,

        pdfUrl, // ⭐⭐⭐
        status: "kaydedildi",

        createdAt: new Date(),
      });
    }

    /* ───────── RESPONSE ───────── */
    return res.status(200).json({
      success: true,
      teklifId: teklif._id,
      pdfUrl: teklif.pdfUrl,
      message: "Teklif PDF başarıyla kaydedildi",
    });
  } catch (err) {
    console.error("❌ TEKLİF SAVE ERROR:", err);
    return res.status(500).json({
      message: "Sunucu hatası",
      error: err.message,
    });
  }
}
