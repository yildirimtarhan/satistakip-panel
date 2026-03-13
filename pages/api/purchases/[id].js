import dbConnect from "@/lib/dbConnect";
import Transaction from "@/models/Transaction";
import Cari from "@/models/Cari";
import Product from "@/models/Product";
import jwt from "jsonwebtoken";

const ITEMS_MARKER = "__PURCHASE_ITEMS__:";
const CANCEL_MARKER = "__PURCHASE_CANCELLED__:";

function extractItemsFromNote(note) {
  if (!note || typeof note !== "string") return null;
  const idx = note.indexOf(ITEMS_MARKER);
  if (idx === -1) return null;
  const json = note.slice(idx + ITEMS_MARKER.length).trim();
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function extractHumanNote(note) {
  if (!note || typeof note !== "string") return "";
  const idx = note.indexOf(ITEMS_MARKER);
  return idx === -1 ? note.trim() : note.slice(0, idx).trim();
}

function isCancelled(note) {
  return typeof note === "string" && note.includes(CANCEL_MARKER);
}

export default async function handler(req, res) {
  // Cache kapat
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  if (req.method !== "GET" && req.method !== "DELETE" && req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await dbConnect();

    // 🔐 Token
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ message: "Token yok" });

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded.userId || decoded.id || decoded._id;
    const companyId = decoded.companyId || null;

    const { id } = req.query;
    if (!id) return res.status(400).json({ message: "ID yok" });

    // companyId varsa toleranslı filtre (eski kayıtlar companyId olmadan oluşturulmuş olabilir)
    const baseFilter = {
      _id: id,
      type: "purchase",
      $or: [
        { userId },
        ...(companyId ? [{ companyId }] : []),
      ],
    };

    // =========================
    // ✅ GET (DETAY)
    // =========================
    if (req.method === "GET") {
      const purchase = await Transaction.findOne(baseFilter)
        .populate("accountId")
        .populate("productId", "name barcode") // legacy tek satır için
        .lean();

      if (!purchase) return res.status(404).json({ message: "Kayıt bulunamadı" });

      let items = extractItemsFromNote(purchase.note);

      if (!items && purchase.productId) {
        items = [
          {
            productId: purchase.productId,
            quantity: purchase.quantity,
            unitPrice: purchase.unitPrice,
            total: purchase.total || purchase.totalTRY || purchase.amount || 0,
          },
        ];
      }

      if (!items) items = [];

      // ürün bilgilerini doldur
      const ids = items
        .map((i) => i?.productId && (i.productId._id || i.productId))
        .filter(Boolean);

      if (ids.length) {
        const prods = await Product.find({ _id: { $in: ids } }).select("name barcode").lean();
        const byId = new Map(prods.map((p) => [String(p._id), p]));
        items = items.map((i) => {
          const rawId = i.productId && (i.productId._id || i.productId);
          const key = rawId ? String(rawId) : "";
          const prod = byId.get(key);
          return {
            ...i,
            productId: prod ? { _id: key, name: prod.name, barcode: prod.barcode } : { _id: key },
          };
        });
      }

      return res.status(200).json({
        ...purchase,
        items,
        description: extractHumanNote(purchase.note) || "Alış",
        cancelled: isCancelled(purchase.note),
      });
    }

    // =========================
    // ✅ PUT (DÜZENLEME — sadece tarih+açıklama VEYA tam güncelleme items ile)
    // =========================
    if (req.method === "PUT") {
      const purchase = await Transaction.findOne(baseFilter).lean();
      if (!purchase) return res.status(404).json({ message: "Kayıt bulunamadı" });
      if (isCancelled(purchase.note)) return res.status(409).json({ message: "İptal edilmiş alış düzenlenemez." });

      const { date, description, accountId: newAccountId, items: newItems } = req.body || {};

      // 🔥 TAM GÜNCELLEME (items gönderilmişse)
      if (Array.isArray(newItems) && newItems.length > 0) {
        const cari = await Cari.findById(newAccountId || purchase.accountId);
        if (!cari) return res.status(404).json({ message: "Cari bulunamadı" });

        const cleanItems = [];
        let grandTotalTRY = 0;
        for (const it of newItems) {
          const productId = it?.productId;
          const quantity = Number(it?.quantity || 0);
          const unitPrice = Number(it?.unitPrice || 0);
          const currency = it?.currency || "TRY";
          const fxRate = Number(it?.fxRate || 1);
          const kdv = Number(it?.kdv ?? 20);
          const iskonto = Number(it?.iskonto ?? 0);
          if (!productId || quantity <= 0) continue;
          const araToplam = quantity * unitPrice;
          const netToplam = araToplam * (1 - iskonto / 100);
          const kdvliDoviz = netToplam * (1 + kdv / 100);
          const fx = currency === "TRY" ? 1 : fxRate || 1;
          const lineTotalTRY = Number(it?.total) > 0 ? Number(it?.total) : Number((kdvliDoviz * fx).toFixed(2));
          grandTotalTRY += lineTotalTRY;
          cleanItems.push({
            productId,
            quantity,
            unitPrice,
            kdv,
            iskonto,
            currency,
            fxRate: currency === "TRY" ? 1 : fxRate || 1,
            total: lineTotalTRY,
            totalFCY: currency === "TRY" ? 0 : Number(kdvliDoviz.toFixed(2)),
          });
        }
        if (cleanItems.length === 0) return res.status(400).json({ message: "Geçerli kalem yok" });

        const oldItems = extractItemsFromNote(purchase.note) || [];
        for (const it of oldItems) {
          const pid = it.productId && (it.productId._id || it.productId);
          const qty = Number(it.quantity || 0);
          if (pid && qty > 0) await Product.findByIdAndUpdate(pid, { $inc: { stock: -qty } });
        }
        for (const it of cleanItems) {
          await Product.findByIdAndUpdate(it.productId, { $inc: { stock: it.quantity } });
        }

        const humanNote = (typeof description === "string" ? description.trim() : "") || "Ürün Alış";
        const fxItem = cleanItems.find((x) => (x.currency || "TRY") !== "TRY") || cleanItems[0];
        const currency = fxItem?.currency || "TRY";
        const fxRate = Number(fxItem?.fxRate || 1);
        const invoiceNo = req.body?.invoiceNo || "";
        const orderNo = req.body?.orderNo || "";
        const noteStr =
          humanNote +
          (invoiceNo ? ` | Fatura: ${invoiceNo}` : "") +
          (orderNo ? ` | Sipariş: ${orderNo}` : "") +
          `\n${ITEMS_MARKER}${JSON.stringify(cleanItems)}`;

        await Transaction.updateOne(
          { _id: id },
          {
            $set: {
              date: date ? new Date(date) : purchase.date,
              accountId: newAccountId || purchase.accountId,
              amount: Number(grandTotalTRY.toFixed(2)),
              totalTRY: Number(grandTotalTRY.toFixed(2)),
              currency,
              fxRate,
              note: noteStr,
            },
          }
        );
        return res.status(200).json({ message: "Alış güncellendi" });
      }

      // Sadece tarih + açıklama
      const updates = {};
      if (date) updates.date = new Date(date);
      const humanNote = typeof description === "string" ? description.trim() : null;
      if (humanNote !== null) {
        const itemsJson = (() => {
          const idx = (purchase.note || "").indexOf(ITEMS_MARKER);
          return idx >= 0 ? (purchase.note || "").slice(idx) : "";
        })();
        updates.note = itemsJson ? `${humanNote}\n${itemsJson}` : humanNote;
      }
      if (Object.keys(updates).length === 0) return res.status(200).json({ message: "Değişiklik yok" });
      await Transaction.updateOne({ _id: id }, { $set: updates });
      return res.status(200).json({ message: "Alış güncellendi" });
    }

    // =========================
    // ✅ DELETE (İPTAL)
    // =========================
    const purchaseDoc = await Transaction.findOne(baseFilter).lean();
    if (!purchaseDoc) return res.status(404).json({ message: "Kayıt bulunamadı" });

    if (isCancelled(purchaseDoc.note)) {
      return res.status(409).json({ message: "Bu alış zaten iptal edilmiş." });
    }

    // items al
    let items = extractItemsFromNote(purchaseDoc.note);
    if (!items && purchaseDoc.productId) {
      items = [
        {
          productId: purchaseDoc.productId,
          quantity: purchaseDoc.quantity,
          unitPrice: purchaseDoc.unitPrice,
          total: purchaseDoc.total || purchaseDoc.totalTRY || purchaseDoc.amount || 0,
        },
      ];
    }
    if (!items) items = [];

    if (items.length === 0) {
      return res.status(400).json({ message: "İptal edilecek alış kalemi bulunamadı." });
    }

    // 1) Stok geri al (stok düş)
    for (const it of items) {
      const pid = it.productId && (it.productId._id || it.productId);
      const qty = Number(it.quantity || 0);
      if (!pid || qty <= 0) continue;
      await Product.findByIdAndUpdate(pid, { $inc: { stock: -qty } });
    }

    const amount = Number(purchaseDoc.totalTRY || purchaseDoc.amount || 0);

    // 2) Cari için ters kayıt oluştur (companyId zorunlu)
    const cancelCompanyId =
      (purchaseDoc.companyId && String(purchaseDoc.companyId)) ||
      (companyId && String(companyId)) ||
      String(userId || "unknown");
    const cancelTx = await Transaction.create({
      userId: purchaseDoc.userId,
      companyId: cancelCompanyId,
      accountId: purchaseDoc.accountId,
      type: "purchase_cancel",
      direction: "alacak",
      amount,
      totalTRY: amount,
      date: new Date(),
      note:
        `Alış iptal edildi | Ref: ${purchaseDoc._id}\n` +
        `${ITEMS_MARKER}${JSON.stringify(items)}`,
    });

    // 3) Orijinal kaydı iptal olarak işaretle (liste/tekrar iptal için)
    const stamp = `${CANCEL_MARKER}${new Date().toISOString()}|by:${userId}|cancelTx:${cancelTx._id}\n`;
    const newNote = stamp + (purchaseDoc.note || "");

    await Transaction.updateOne({ _id: purchaseDoc._id }, { $set: { note: newNote } });

    return res.status(200).json({
      message: "✅ Alış iptal edildi (stok + cari ters kayıt işlendi)",
      cancelledId: cancelTx._id,
    });
  } catch (err) {
    console.error("PURCHASE DETAIL/DELETE ERROR:", err);
    return res.status(500).json({
      message: "İşlem başarısız",
      error: err.message,
    });
  }
}
