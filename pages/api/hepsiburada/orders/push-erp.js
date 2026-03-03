/**
 * Hepsiburada siparişlerini ERP'ye aktarır: Cari (müşteri) + Satış (Transaction).
 * Sadece henüz aktarılmamış (erpPushed !== true) siparişler işlenir.
 */
import { connectToDatabase } from "@/lib/mongodb";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";
import { verifyToken } from "@/utils/auth";
import User from "@/models/User";
import Cari from "@/models/Cari";
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";
import { createPazaryeriBorcAndUpdateBakiye } from "@/lib/pazaryeriCari";

function normalizePhoneTR(phone = "") {
  const digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length >= 12) return digits;
  if (digits.startsWith("0") && digits.length >= 11) return "9" + digits;
  if (digits.length === 10) return "90" + digits;
  return digits;
}

function ensureArray(v) {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function extractBuyerFromHbOrder(doc) {
  const data = doc?.data || doc?.raw || {};
  const ship = data.shippingAddress || data.shipmentAddress || {};
  const recipient = ship.recipientName || ship.fullName || ship.name || data.recipientName || "";
  const email = (data.customerEmail || data.buyer?.email || data.email || "").toString().trim().toLowerCase();
  const phone = normalizePhoneTR(ship.phone || ship.gsm || ship.mobile || data.phone || data.buyer?.phone || "");
  const fullName = recipient || (data.buyer?.fullName || data.buyer?.name) || "Hepsiburada Müşteri";
  const hbCustomerId = String(data.customerId || data.buyer?.id || doc.hbCustomerId || "").trim();
  return { fullName, email, phone, hbCustomerId };
}

function extractLinesFromHbOrder(doc) {
  const data = doc?.data || doc?.raw || {};
  const lines = ensureArray(data.lines || data.orderLines || data.lineItems || data.items);
  return lines.map((it) => {
    const sku = String(it.merchantSku ?? it.sellerSku ?? it.sku ?? "").trim();
    const barcode = String(it.barcode ?? "").trim();
    const quantity = Number(it.quantity ?? 1);
    const unitPrice = Number(it.unitPrice ?? it.price ?? it.salePrice ?? 0);
    const name = it.productName ?? it.title ?? it.name ?? sku ?? barcode ?? "HB Ürün";
    return { sku, barcode, quantity, unitPrice, vatRate: 20, name };
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Sadece POST" });
  }

  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const tokenUser = verifyToken(token);
    if (!tokenUser?.userId) {
      return res.status(401).json({ success: false, message: "Yetkisiz" });
    }

    const dbUser = await User.findById(tokenUser.userId).select("_id companyId");
    if (!dbUser) return res.status(401).json({ success: false, message: "Kullanıcı bulunamadı" });

    const userIdStr = String(dbUser._id);
    const companyIdStr = dbUser.companyId ? String(dbUser.companyId) : "";
    if (!companyIdStr) {
      return res.status(400).json({ success: false, message: "Firma (companyId) atanmamış" });
    }
    const companyIdObj = new mongoose.Types.ObjectId(companyIdStr);

    await dbConnect();
    const { db } = await connectToDatabase();
    const col = db.collection("hb_orders");

    let docs = await col
      .find({ $or: [{ erpPushed: { $ne: true } }, { erpPushed: { $exists: false } }] })
      .sort({ fetchedAt: -1 })
      .limit(50)
      .toArray();

    // Listede görünen örnek sipariş (TEST-HB-ORDER-123456) DB'de yoksa önce DB'ye yaz; böylece Cari + satış oluşur
    const bodyOrderNumbers = req.body?.orderNumbers && Array.isArray(req.body.orderNumbers) ? req.body.orderNumbers : [];
    const sampleOrderNumber = "TEST-HB-ORDER-123456";
    if (docs.length === 0 && bodyOrderNumbers.includes(sampleOrderNumber)) {
      const now = new Date();
      await col.updateOne(
        { orderNumber: sampleOrderNumber },
        {
          $set: {
            orderNumber: sampleOrderNumber,
            data: {
              orderNumber: sampleOrderNumber,
              status: "AwaitingShipment",
              shippingAddress: { recipientName: "Test Müşteri", phone: "5551234567", address: "Test Mah. Test Sk.", district: "Kadıköy", city: "İstanbul" },
              customerEmail: "test@test.com",
              lines: [{ merchantSku: "TEST-SKU", quantity: 1, unitPrice: 99.9, productName: "Test Ürün" }],
            },
            fetchedAt: now,
            updatedAt: now,
          },
        },
        { upsert: true }
      );
      docs = await col
        .find({ $or: [{ erpPushed: { $ne: true } }, { erpPushed: { $exists: false } }] })
        .sort({ fetchedAt: -1 })
        .limit(50)
        .toArray();
    }

    if (!docs.length) {
      return res.status(200).json({
        success: true,
        message: "ERP'ye aktarılacak yeni sipariş yok. Listede gördüğünüz sipariş webhook ile gelmeli veya 'Örnek test verisi' ile eklenmeli.",
        salesCreated: 0,
        salesSkipped: 0,
        failed: [],
      });
    }

    let salesCreated = 0;
    let salesSkipped = 0;
    const failed = [];

    for (const d of docs) {
      const orderNumber = d.data?.orderNumber || d.orderNumber;
      if (!orderNumber) {
        failed.push({ orderNumber: "-", error: "Sipariş numarası yok" });
        continue;
      }
      const saleNo = `HB-${orderNumber}`;

      try {
        const exists = await Transaction.findOne({
          companyId: companyIdStr,
          type: "sale",
          saleNo,
          isDeleted: { $ne: true },
        }).lean();
        if (exists) {
          await col.updateOne(
            { $or: [{ orderNumber }, { "data.orderNumber": orderNumber }] },
            { $set: { erpPushed: true, erpSaleNo: saleNo, companyId: companyIdStr, userId: userIdStr } }
          );
          salesSkipped++;
          continue;
        }

        const { fullName, email, phone, hbCustomerId } = extractBuyerFromHbOrder(d);
        const or = [];
        if (hbCustomerId) or.push({ hbCustomerId: hbCustomerId });
        if (email) or.push({ email });
        if (phone) or.push({ telefon: phone });

        let cari = null;
        if (or.length) {
          cari = await Cari.findOne({ companyId: companyIdObj, $or: or });
        }
        if (!cari) {
          cari = await Cari.create({
            companyId: companyIdObj,
            userId: dbUser._id,
            ad: fullName,
            email: email || "",
            telefon: phone || "",
            hbCustomerId: hbCustomerId || "",
            tur: "Müşteri",
          });
        } else {
          let changed = false;
          if (hbCustomerId && !cari.hbCustomerId) {
            cari.hbCustomerId = hbCustomerId;
            changed = true;
          }
          if (fullName && fullName !== "Hepsiburada Müşteri" && String(fullName).trim()) {
            if (String(cari.ad || "").trim() !== String(fullName).trim()) {
              cari.ad = fullName.trim();
              changed = true;
            }
          }
          if (email && !cari.email) {
            cari.email = email;
            changed = true;
          }
          if (phone && !cari.telefon) {
            cari.telefon = phone;
            changed = true;
          }
          if (changed) await cari.save();
        }

        const lineItems = extractLinesFromHbOrder(d);
        if (!lineItems.length) {
          failed.push({ orderNumber, error: "Sipariş kalemi yok" });
          continue;
        }

        const saleItems = [];
        for (const it of lineItems) {
          if (it.quantity <= 0) continue;
          let product = null;
          if (it.sku) {
            product = await Product.findOne({ companyId: companyIdObj, $or: [{ sku: it.sku }, { barcode: it.sku }] }).lean();
          }
          if (!product?._id && it.barcode) {
            product = await Product.findOne({ companyId: companyIdObj, barcode: it.barcode }).lean();
          }
          saleItems.push({
            productId: product?._id || null,
            name: it.name,
            barcode: it.barcode || "",
            sku: it.sku || "",
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            vatRate: Number(it.vatRate ?? 20),
          });
        }

        let subTotal = 0;
        const normalizedItems = saleItems.map((i) => {
          const qty = Number(i.quantity || 1);
          const price = Number(i.unitPrice || 0);
          const vatRate = Number(i.vatRate || 0);
          const lineSub = qty * price;
          const lineVat = lineSub * (vatRate / 100);
          subTotal += lineSub + lineVat;
          return { ...i, total: lineSub + lineVat };
        });
        const totalTRY = subTotal;

        await Transaction.create({
          userId: userIdStr,
          companyId: companyIdStr,
          accountId: cari._id,
          accountName: fullName && fullName !== "Hepsiburada Müşteri" ? fullName.trim() : "",
          type: "sale",
          saleNo,
          date: d.fetchedAt ? new Date(d.fetchedAt) : new Date(),
          paymentMethod: "open",
          note: "Hepsiburada siparişi",
          currency: "TRY",
          fxRate: 1,
          items: normalizedItems,
          totalTRY,
          direction: "borc",
          amount: totalTRY,
        });

        // Pazaryeri muhasebe: Hepsiburada carisine borç (platformun size borcu)
        await createPazaryeriBorcAndUpdateBakiye({
          pazaryeriAd: "Hepsiburada",
          companyIdObj,
          companyIdStr,
          userIdStr,
          userIdObj: dbUser._id,
          saleNo,
          totalTRY,
          note: `Hepsiburada sipariş ${orderNumber}`,
          date: d.fetchedAt ? new Date(d.fetchedAt) : new Date(),
        });

        await col.updateOne(
          { $or: [{ orderNumber }, { "data.orderNumber": orderNumber }] },
          { $set: { erpPushed: true, erpSaleNo: saleNo, companyId: companyIdStr, userId: userIdStr } }
        );
        salesCreated++;
      } catch (e) {
        failed.push({ orderNumber, error: e.message || String(e) });
      }
    }

    return res.status(200).json({
      success: true,
      message: `${salesCreated} sipariş ERP'ye aktarıldı`,
      salesCreated,
      salesSkipped,
      failed: failed.slice(0, 20),
    });
  } catch (err) {
    console.error("HB push-erp error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "ERP aktarımı başarısız",
    });
  }
}
