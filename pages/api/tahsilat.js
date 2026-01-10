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

    // 🔐 TOKEN
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ message: "Token yok" });

    const token = auth.replace("Bearer ", "");
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Geçersiz token" });
    }

    const userId = decoded.userId || decoded.id || decoded._id;
    const companyId = decoded.companyId || null;
    const role = decoded.role || "user";

    if (!userId) return res.status(401).json({ message: "Kullanıcı bulunamadı" });

    // (senin mevcut kuralın)
    if (role === "admin") {
      return res.status(403).json({ message: "Admin ERP işlemi yapamaz" });
    }

    // 📥 BODY
    const { accountId, type, amount, note, date } = req.body;

    // method gönderen UI ile uyum: method || paymentMethod
    const paymentMethod =
      req.body.paymentMethod || req.body.method || "Nakit";

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

    // 🧾 CARİ BUL (multi-tenant)
    const cari = await Cari.findOne({
      _id: accountId,
      ...(companyId ? { companyId } : { userId }),
    });

    if (!cari) {
      return res.status(404).json({ message: "Cari bulunamadı" });
    }

    // 🔁 STANDARD
    // tahsilat → alacak
    // ödeme    → borc
    const direction = type === "tahsilat" ? "alacak" : "borc";
    const trxType = "payment"; // kritik

    // 💰 (opsiyonel) cari.bakiye güncelle (mevcut sistemin bozulmaması için korundu)
    // bakiye = borç - alacak
    const delta = direction === "alacak" ? -tutar : tutar;
    cari.bakiye = Number(cari.bakiye || 0) + delta;
    cari.updatedAt = new Date();
    await cari.save();

    // 📚 TRANSACTION
    const trx = await Transaction.create({
      userId,
      companyId: companyId || undefined,
      accountId,
      type: trxType,
      direction,
      amount: tutar,
      currency: "TRY",
      paymentMethod,
      note: note || "",
      date: date ? new Date(date) : new Date(),
      source: "manual",
      createdBy: userId,
    });

    return res.status(200).json({
      success: true,
      message: "Tahsilat/Ödeme kaydedildi",
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
