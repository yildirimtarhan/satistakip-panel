/**
 * Pazaryeri muhasebe için N11 ve Trendyol carilerini oluşturur (yoksa).
 * Hepsiburada carisi ilk HB sipariş ERP aktarımında zaten oluşur.
 * POST, JWT gerekli.
 */
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import { getOrCreatePazaryeriCari } from "@/lib/pazaryeriCari";

const PAZARYERLERI = ["N11", "Trendyol"];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Sadece POST" });
  }

  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: "Yetkisiz" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyIdStr = String(decoded.companyId || "");
    const userIdStr = String(decoded.userId || decoded.id || "");

    if (!mongoose.Types.ObjectId.isValid(companyIdStr)) {
      return res.status(400).json({ success: false, message: "Firma (companyId) geçersiz" });
    }

    const companyIdObj = new mongoose.Types.ObjectId(companyIdStr);
    const userIdObj = mongoose.Types.ObjectId.isValid(userIdStr) ? new mongoose.Types.ObjectId(userIdStr) : null;

    await dbConnect();

    const created = [];
    for (const ad of PAZARYERLERI) {
      const { created: wasNew } = await getOrCreatePazaryeriCari(ad, companyIdObj, userIdObj);
      if (wasNew) created.push(ad);
    }

    return res.status(200).json({
      success: true,
      message: created.length ? `${created.join(", ")} pazaryeri carisi oluşturuldu.` : "N11 ve Trendyol carileri zaten mevcut.",
      created,
    });
  } catch (err) {
    console.error("pazaryeri ensure-caris error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "İşlem başarısız",
    });
  }
}
