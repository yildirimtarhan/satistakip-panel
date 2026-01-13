import dbConnect from "@/lib/dbConnect";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import { verifyToken } from "@/utils/auth";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST" });
  }

  try {
    await dbConnect();

    // 🔐 AUTH
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const tokenUser = verifyToken(token);

    if (!tokenUser?.userId) {
      return res.status(401).json({ message: "Yetkisiz" });
    }

    const dbUser = await User.findById(tokenUser.userId).select("_id role companyId");
    if (!dbUser) return res.status(401).json({ message: "Kullanıcı bulunamadı" });

    const role = dbUser.role || "user";
    const userId = String(dbUser._id);
    const companyId = dbUser.companyId ? String(dbUser.companyId) : "";

    // ✅ Body: saleNo zorunlu
    const { saleNo, reason } = req.body || {};
    if (!saleNo) {
      return res.status(400).json({ message: "saleNo zorunlu" });
    }

    // 🧩 Tenant match (Transaction şemasında companyId varsa)
    const tenantMatch = {};
    if (role !== "admin") {
      if (companyId && "companyId" in (Transaction.schema?.paths || {})) tenantMatch.companyId = companyId;
      else tenantMatch.userId = userId;
    }

    // 1) Orijinal satış(lar)ı bul (bazı sistemlerde aynı saleNo ile birden çok satır olabilir)
    const saleDocs = await Transaction.find({
      ...tenantMatch,
      type: "sale",
      saleNo,
      direction: { $in: ["borc", "debit"] },
      $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }],
    }).lean();

    if (!saleDocs.length) {
      return res.status(404).json({ message: "Satış bulunamadı veya zaten iptal edilmiş" });
    }

    // 2) Zaten iptal kaydı var mı? (çift iptali engelle)
    const existingCancel = await Transaction.findOne({
      ...tenantMatch,
      type: "sale_cancel",
      $or: [{ refSaleNo: saleNo }, { saleNo }],
    }).lean();

    if (existingCancel) {
      return res.status(409).json({ message: "Bu satış daha önce iptal edilmiş" });
    }

    // 3) Satış kayıtlarını “satışlar” listesinden düşürmek için işaretle
    await Transaction.updateMany(
      {
        ...tenantMatch,
        type: "sale",
        saleNo,
        direction: { $in: ["borc", "debit"] },
      },
      {
        $set: {
          isDeleted: true,
          canceledAt: new Date(),
          canceledBy: userId,
          cancelReason: reason || "",
        },
      }
    );

    // 4) İptal fişi kaydı oluştur (İade/İptaller menüsünde listelensin)
    // Toplamı güvenli şekilde hesapla (ilk doc üzerinden)
    const first = saleDocs[0];
    const totalTRY =
      Number(first.totalTRY ?? first.grandTotal ?? first.total ?? first.amount ?? 0) || 0;

    const cancelTx = await Transaction.create({
      ...tenantMatch,
      userId: first.userId || userId,
      companyId: first.companyId || companyId || "",
      accountId: first.accountId || null,
      accountName: first.accountName || "",

      type: "sale_cancel",
      // iptalde alacak yazılması mantıklı (satışın ters kaydı)
      direction: "alacak",

      // Refunds ekranı "Belge" için saleNo bekliyor:
      saleNo: saleNo,
      refSaleNo: saleNo,

      date: new Date(),
      note: `Satış iptali (${saleNo})${reason ? " - " + reason : ""}`,

      currency: first.currency || "TRY",
      fxRate: Number(first.fxRate ?? 1) || 1,

      amount: totalTRY,
      totalTRY: totalTRY,

      items: first.items || [],
    });

    return res.status(200).json({
      ok: true,
      message: "Satış başarıyla iptal edildi",
      cancelId: String(cancelTx._id),
    });
  } catch (err) {
    console.error("CANCEL ERROR:", err);
    return res.status(500).json({ message: "İptal işlemi başarısız", error: err.message });
  }
}
