import dbConnect from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import Cari from "@/models/Cari";
import Product from "@/models/Product";
import StockLog from "@/models/StockLog";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

function getTokenFromReq(req) {
  const h = req.headers.authorization || req.headers.Authorization || "";
  if (!h) return "";
  const parts = String(h).split(" ");
  if (parts.length === 2 && parts[0].toLowerCase() === "bearer") return parts[1];
  return "";
}

function decodeUser(req) {
  const token = getTokenFromReq(req);
  if (!token) return { token: "", decoded: null };

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { token, decoded };
  } catch (e) {
    return { token, decoded: null };
  }
}

function toNumber(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Only POST allowed" });
  }

  await dbConnect();

  // ✅ Token -> userId
  const { decoded } = decodeUser(req);
  const userIdRaw = decoded?.id || decoded?._id || decoded?.userId;
  const userId = userIdRaw ? String(userIdRaw) : "";

  if (!userId) {
    return res.status(401).json({ message: "User bulunamadı (token)" });
  }

  // ✅ Body parse (urun-alis.js şu formatı gönderiyor)
  // { supplierId, date, invoiceNo, orderNo, note, items: [{productId, quantity, unitPrice}] }
  const {
    supplierId,
    accountId, // alternatif isim
    date,
    invoiceNo,
    orderNo,
    note,
    items,
    rows, // alternatif isim
  } = req.body || {};

  const accountIdFinal = supplierId || accountId;
  const itemsFinal = Array.isArray(items) ? items : Array.isArray(rows) ? rows : [];

  if (!accountIdFinal || !Array.isArray(itemsFinal) || itemsFinal.length === 0) {
    return res.status(400).json({ message: "Eksik veri" });
  }

  // Kalemleri temizle
  const cleanItems = itemsFinal
    .map((it) => ({
      productId: it.productId,
      quantity: toNumber(it.quantity, 0),
      unitPrice: toNumber(it.unitPrice, 0),
    }))
    .filter((it) => it.productId && it.quantity > 0 && it.unitPrice >= 0);

  if (cleanItems.length === 0) {
    return res.status(400).json({ message: "Eksik veri" });
  }

  // Toplam (şimdilik TRY varsayıyoruz)
  const totalTRY = cleanItems.reduce((s, it) => s + it.quantity * it.unitPrice, 0);

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      // 1) Stok artır + (opsiyonel) stok log
      for (const it of cleanItems) {
        const pid = it.productId;
        const qty = it.quantity;
        const price = it.unitPrice;
console.log("STOK UPDATE →", {
  pid,
  qty
});


        // stok artır
        // (Product şemanda userId varsa bu filtre güvenli; yoksa eşleşmeyebilir)
        let upd = await Product.updateOne(
  { _id: pid },
  {
    $inc: { stock: qty }, // ✅ DOĞRU ALAN
    $set: { updatedAt: new Date() }
  }
);



        // Eğer ürün şemanda userId yoksa, fallback:
        if (upd?.matchedCount === 0) {
          await Product.updateOne(
            { _id: pid },
            { $inc: { stok: qty }, $set: { updatedAt: new Date() } },
            { session }
          );
        }

        // StockLog opsiyonel
        try {
          if (StockLog?.create) {
            await StockLog.create(
              [
                {
                  type: "IN",
                  reason: "purchase",
                  productId: pid,
                  quantity: qty,
                  unitPrice: price,
                  currency: "TRY",
                  fxRate: 1,
                  amountTRY: Number((qty * price).toFixed(2)),
                  date: date ? new Date(date) : new Date(),
                  note: note || invoiceNo || orderNo || "",
                  userId,
                },
              ],
              { session }
            );
          }
        } catch (e) {
          // StockLog patlasa bile alış kaydı devam etsin
          console.warn("StockLog create skipped:", e?.message || e);
        }
      }

      // 2) Cari bakiye güncelle (alış = BORÇ)
      await Cari.updateOne(
        { _id: accountIdFinal, userId },
        {
          $inc: { bakiye: Number(totalTRY.toFixed(2)), totalPurchases: Number(totalTRY.toFixed(2)) },
          $set: { updatedAt: new Date() },
        },
        { session }
      );

      // 3) Ekstreye Transaction yaz (ÖZET kayıt)
      await Transaction.create(
        [
          {
            userId,
            accountId: accountIdFinal,
            type: "purchase",
            amount: Number(totalTRY.toFixed(2)),
            currency: "TRY",
            date: date ? new Date(date) : new Date(),
            description: `Ürün Alış${invoiceNo ? " | Fatura: " + invoiceNo : ""}${
              orderNo ? " | Sipariş: " + orderNo : ""
            }${note ? " | " + note : ""}`,
          },
        ],
        { session }
      );
    });

    return res.status(200).json({
      success: true,
      message: "✅ Alış kaydedildi",
      totalTRY: Number(totalTRY.toFixed(2)),
    });
  } catch (err) {
    console.error("PURCHASE ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err?.message || "Alış kaydedilemedi",
    });
  } finally {
    session.endSession();
  }
}
