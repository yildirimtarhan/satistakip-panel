import dbConnect from "@/lib/mongodb";
import jwt from "jsonwebtoken";

import Cari from "@/models/Cari";
import N11Order from "@/models/N11Order";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    await dbConnect();

    // ✅ TOKEN oku (Authorization veya cookie)
    const authHeader = req.headers.authorization || "";
    const tokenFromHeader = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    const tokenFromCookie = req.cookies?.token || null;

    const token = tokenFromHeader || tokenFromCookie;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token gerekli",
      });
    }

    // ✅ JWT decode
    let decoded = null;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Token geçersiz / süresi dolmuş",
      });
    }

    const userId = decoded?.userId;
    const companyId = decoded?.companyId;

    if (!userId || !companyId) {
      return res.status(400).json({
        success: false,
        message: "Token içinde userId/companyId yok",
      });
    }

    const { orderNumber, cariId } = req.body || {};

    if (!orderNumber || !cariId) {
      return res.status(400).json({
        success: false,
        message: "orderNumber ve cariId zorunlu",
      });
    }

    // ✅ Cari bulundu mu (multi-tenant)
    const cari = await Cari.findOne({ _id: cariId, companyId }).lean();
    if (!cari) {
      return res.status(404).json({
        success: false,
        message: "Cari bulunamadı veya bu firmaya ait değil",
      });
    }

    // ✅ Sipariş bulundu mu (multi-tenant)
    const order = await N11Order.findOne({
      orderNumber,
      companyId,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Sipariş bulunamadı",
      });
    }

    // ✅ Order'a cari linkle
    order.accountId = cari._id;   // ⭐ önemli: senin ekranda okuduğun alan
    order.cariId = cari._id;      // (ikisini de yazıyoruz garanti olsun)
    order.updatedBy = userId;

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Sipariş cari ile eşleştirildi",
      cari: {
        _id: cari._id.toString(),
        ad: cari.ad || "",
        telefon: cari.telefon || "",
        email: cari.email || "",
      },
    });
  } catch (err) {
    console.error("CARI LINK ORDER ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Sipariş cari eşleştirme sırasında hata oluştu",
      error: err?.message || String(err),
    });
  }
}
