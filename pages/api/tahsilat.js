import dbConnect from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import Cari from "@/models/Cari";
import Transaction from "@/models/Transaction";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST desteklenir" });
  }

  try {
    await dbConnect();

    /* =======================
       🔐 TOKEN
    ======================= */
    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({ message: "Token yok" });
    }

    const token = auth.replace("Bearer ", "");
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Geçersiz token" });
    }

    // ✅ Senin standart JWT alanların: { userId, companyId, role }
    const role = decoded.role || "user";
    const userId = decoded.userId || decoded.id || decoded._id;
    const companyId = decoded.companyId || decoded.firmaId || null;

    if (!userId) {
      return res.status(401).json({ message: "Kullanıcı bulunamadı" });
    }

    // ✅ Senin kuralın: Admin ERP işlemi yapamaz (tahsilat ERP işlemidir)
    if (role === "admin") {
      return res.status(403).json({ message: "Admin ERP işlemi yapamaz" });
    }

    // ✅ User için companyId zorunlu (multi-tenant izolasyon)
    if (!companyId) {
      return res.status(401).json({ message: "Firma bilgisi yok (companyId)" });
    }

    /* =======================
       📥 BODY
    ======================= */
    const {
      accountId,
      type, // "tahsilat" | "odeme"
      paymentMethod,
      amount,
      note,
    } = req.body;

    if (!accountId || !type || !amount) {
      return res.status(400).json({ message: "Zorunlu alanlar eksik" });
    }

    if (!["tahsilat", "odeme"].includes(type)) {
      return res.status(400).json({ message: "Geçersiz işlem türü" });
    }

    const tutar = Number(amount);
    if (!Number.isFinite(tutar) || tutar <= 0) {
      return res.status(400).json({ message: "Geçersiz tutar" });
    }

    /* =======================
       🧾 CARİ BUL (multi-tenant kilit)
    ======================= */
    const cari = await Cari.findOne({
      _id: accountId,
      companyId, // ✅ user sadece kendi firmasındaki cariye işlem yapabilir
    });

    if (!cari) {
      return res.status(404).json({ message: "Cari bulunamadı" });
    }

    /* =======================
       💰 BAKİYE HESABI
       tahsilat → borç AZALIR
       ödeme    → borç ARTAR
    ======================= */
    const bakiyeDegisim = type === "tahsilat" ? -tutar : tutar;

    cari.bakiye = Number(cari.bakiye || 0) + bakiyeDegisim;
    cari.updatedAt = new Date();
    await cari.save();

    /* =======================
       📚 EKSTRE (Transaction)
       source: "manual" -> kullanıcı girişi (senin kilit kuralına uygun)
    ======================= */
    const trx = await Transaction.create({
      userId,
      companyId,
      accountId,
      type, // tahsilat | odeme
      paymentMethod,
      amount: tutar,
      currency: "TRY",
      date: new Date(),
      note: note || "",
      source: "manual",
    });

    return res.status(200).json({
      success: true,
      message: "İşlem kaydedildi",
      bakiye: cari.bakiye,
      transaction: trx,
    });
  } catch (err) {
    console.error("❌ TAHSİLAT API HATASI:", err);
    return res.status(500).json({
      message: "Tahsilat/Ödeme kaydedilemedi",
      error: err.message,
    });
  }
}
