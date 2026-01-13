import dbConnect from "@/lib/dbConnect";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import { verifyToken } from "@/utils/auth";
import mongoose from "mongoose";

function toNumber(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function normalizeItems(items) {
  if (!Array.isArray(items)) return null;

  return items
    .filter(Boolean)
    .map((it) => {
      const quantity = toNumber(it.quantity ?? it.qty ?? 0, 0);
      const unitPrice = toNumber(it.unitPrice ?? it.price ?? 0, 0);

      const total =
        Number.isFinite(toNumber(it.total, NaN)) ? toNumber(it.total) : quantity * unitPrice;

      return {
        ...it,
        name: it.name ?? it.title ?? it.productName ?? "",
        quantity,
        unitPrice,
        total,
      };
    });
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  if (req.method !== "POST" && req.method !== "PUT") {
    return res.status(405).json({ message: "Sadece POST/PUT" });
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
    if (!dbUser) {
      return res.status(401).json({ message: "Kullanıcı bulunamadı" });
    }

    // ✅ saleNo: body'den ya da query'den al
    const saleNo = req.body?.saleNo || req.query?.saleNo;
    if (!saleNo) {
      return res.status(400).json({ message: "saleNo gerekli" });
    }

    // 🔎 GÜVENLİ FILTER
    const filter = {
      type: "sale",
      saleNo: String(saleNo),
      isDeleted: { $ne: true },
    };

    const role = dbUser.role || "user";
    if (role === "admin") {
      // admin ise companyId varsa company bazlı sınırla (opsiyonel)
      if (dbUser.companyId) {
        filter.companyId = String(dbUser.companyId);
      }
    } else {
      // normal kullanıcı: kendi kayıtları
      filter.userId = String(dbUser._id);
      if (dbUser.companyId) filter.companyId = String(dbUser.companyId);
    }

    // ✅ UPDATE PAYLOAD (sadece gelen alanları set et!)
    const $set = {};

    // Basit alanlar (gelmişse)
    const simpleFields = [
      "date",
      "accountId",
      "accountName",
      "paymentType",
      "currency",
      "fxRate",
      "note",
      "description",
    ];

    for (const f of simpleFields) {
      if (req.body && Object.prototype.hasOwnProperty.call(req.body, f)) {
        $set[f] = req.body[f];
      }
    }

    // ✅ Items geldiyse: normalize + total hesapla
    let normalized = null;
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, "items")) {
      normalized = normalizeItems(req.body.items);

      // items yanlış geldiyse (array değilse) mevcut items'ı SİLME
      if (normalized) {
        $set.items = normalized;

        // totals
        const itemsSum = normalized.reduce((acc, it) => acc + toNumber(it.total, 0), 0);

        // totalTRY: body gönderilmişse onu al, yoksa itemsSum
        const totalTRYFromBody =
          req.body && Object.prototype.hasOwnProperty.call(req.body, "totalTRY")
            ? toNumber(req.body.totalTRY, NaN)
            : NaN;

        $set.totalTRY = Number.isFinite(totalTRYFromBody) ? totalTRYFromBody : itemsSum;

        // Bazı eski alan isimleriyle uyum (opsiyonel ama işe yarar)
        $set.total = itemsSum;
        $set.grandTotal = itemsSum;
      }
    }

    // totalTRY body'de var ama items yoksa: sadece totalTRY set et (items'a dokunma)
    if (
      req.body &&
      Object.prototype.hasOwnProperty.call(req.body, "totalTRY") &&
      !Object.prototype.hasOwnProperty.call(req.body, "items")
    ) {
      $set.totalTRY = toNumber(req.body.totalTRY, 0);
    }

    // Eğer hiç set edilecek alan yoksa boş güncelleme olmasın
    if (Object.keys($set).length === 0) {
      return res.status(400).json({ message: "Güncellenecek veri yok" });
    }

    $set.updatedAt = new Date();

    const updated = await Transaction.findOneAndUpdate(
      filter,
      { $set },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ message: "Satış bulunamadı / yetkin yok" });
    }

    return res.status(200).json({
      success: true,
      record: updated,
    });
  } catch (err) {
    console.error("SALE UPDATE ERROR:", err);
    return res.status(500).json({ message: "Satış güncellenemedi", error: err.message });
  }
}
