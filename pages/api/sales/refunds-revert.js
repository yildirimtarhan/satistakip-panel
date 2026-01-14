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

    const { id } = req.body || {};
    if (!id) return res.status(400).json({ message: "id gerekli" });

    // 🧩 Tenant match (senin refunds.js ile aynı mantık)
    const tenantMatch = {};
    if (role !== "admin") {
      if (companyId && "companyId" in (Transaction.schema?.paths || {})) tenantMatch.companyId = companyId;
      else tenantMatch.userId = userId;
    }

    // ✅ Refund kaydı bul
    const refundTx = await Transaction.findOne({
      ...tenantMatch,
      _id: id,
      type: { $in: ["sale_cancel", "sale_return"] },
    });

    if (!refundTx) {
      return res.status(404).json({ message: "İade/iptal kaydı bulunamadı" });
    }

    // ✅ Hangi satışa ait?
    const refSaleNo = refundTx.refSaleNo || refundTx.saleNo;
    if (!refSaleNo) {
      return res.status(400).json({ message: "refSaleNo bulunamadı (geri alınamaz)" });
    }

    // ✅ Orijinal satışı geri aç
    await Transaction.updateMany(
      {
        ...tenantMatch,
        type: "sale",
        saleNo: refSaleNo,
      },
      {
        $set: {
          isDeleted: false,
          status: "active",
        },
      }
    );

    // ✅ İptal/İade fişini pasifleştir (silme yok, daha güvenli)
    await Transaction.updateOne(
      { ...tenantMatch, _id: refundTx._id },
      {
        $set: {
          isDeleted: true,
          status: "reversed",
          note: (refundTx.note || "") + " | (Geri alındı)",
        },
      }
    );

    return res.status(200).json({ ok: true, message: "İşlem geri alındı ✅" });
  } catch (err) {
    console.error("REFUND REVERT ERROR:", err);
    return res.status(500).json({ message: "Geri alma başarısız", error: err.message });
  }
}
