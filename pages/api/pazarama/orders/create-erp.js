/**
 * Pazarama siparişlerini ERP'ye aktarır: Cari + Satış + Pazaryeri borcu.
 * N11/Hepsiburada create-erp ile aynı mantık.
 */
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import { connectToDatabase } from "@/lib/mongodb";
import Cari from "@/models/Cari";
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";
import { createPazaryeriBorcAndUpdateBakiye } from "@/lib/pazaryeriCari";
import { pushStockToMarketplaces } from "@/lib/pazaryeriStockSync";

function normalizePhoneTR(phone = "") {
  const digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length >= 12) return digits;
  if (digits.startsWith("0") && digits.length >= 11) return "9" + digits;
  if (digits.length === 10) return "90" + digits;
  return digits;
}

function getValue(obj) {
  if (obj == null) return 0;
  if (typeof obj === "number") return obj;
  if (typeof obj === "object" && "value" in obj) return Number(obj.value ?? 0);
  return Number(obj) || 0;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, message: "Sadece POST" });

  try {
    await dbConnect();

    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: "Token yok" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyIdStr = String(decoded.companyId || "");
    const userIdStr = String(decoded.userId || decoded.id || "");

    if (!mongoose.Types.ObjectId.isValid(companyIdStr) || !mongoose.Types.ObjectId.isValid(userIdStr)) {
      return res.status(400).json({ success: false, message: "Token içinde companyId/userId geçersiz" });
    }
    const companyIdObj = new mongoose.Types.ObjectId(companyIdStr);
    const userIdObj = new mongoose.Types.ObjectId(userIdStr);

    const orders = req.body?.orders;
    if (!Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({ success: false, message: "orders dizisi gerekli" });
    }

    let salesCreated = 0;
    let salesSkipped = 0;
    const failed = [];
    const affectedProductIds = [];

    for (const o of orders) {
      const orderNumber = o.orderNumber || o.orderId;
      if (!orderNumber) {
        failed.push({ orderNumber: "-", error: "Sipariş numarası yok" });
        continue;
      }
      const saleNo = `PZRM-${orderNumber}`;

      try {
        const exists = await Transaction.findOne({
          companyId: companyIdStr,
          type: "sale",
          saleNo,
          isDeleted: { $ne: true },
        }).lean();
        if (exists) {
          salesSkipped++;
          continue;
        }

        const ship = o.shipmentAddress || {};
        const fullName = ship.nameSurname || o.customerName || "Pazarama Müşteri";
        const email = String(o.customerEmail || ship.customerEmail || "").trim().toLowerCase();
        const phone = normalizePhoneTR(ship.phoneNumber || o.customerPhone || "");
        const pazaramaCustomerId = String(o.customerId || "");

        const or = [];
        if (pazaramaCustomerId) or.push({ pazaramaCustomerId });
        if (email) or.push({ email });
        if (phone) or.push({ telefon: phone });

        let cari = await Cari.findOne({ companyId: companyIdObj, $or: or.length ? or : [{ ad: fullName }] });
        if (!cari) {
          cari = await Cari.create({
            companyId: companyIdObj,
            userId: userIdObj,
            ad: fullName,
            email: email || "",
            telefon: phone || "",
            pazaramaCustomerId: pazaramaCustomerId || "",
            tur: "Müşteri",
          });
        } else {
          let changed = false;
          if (pazaramaCustomerId && !cari.pazaramaCustomerId) {
            cari.pazaramaCustomerId = pazaramaCustomerId;
            changed = true;
          }
          if (fullName && fullName !== "Pazarama Müşteri" && String(cari.ad || "").trim() !== String(fullName).trim()) {
            cari.ad = fullName.trim();
            changed = true;
          }
          if (changed) await cari.save();
        }

        const items = Array.isArray(o.items) ? o.items : [];
        const saleItems = [];
        for (const it of items) {
          const qty = Number(it.quantity ?? 1);
          if (qty <= 0) continue;
          const totalVal = getValue(it.totalPrice) || (getValue(it.salePrice) || getValue(it.listPrice)) * qty || 0;
          const unitPrice = qty > 0 ? totalVal / qty : 0;
          const product = it.product || {};
          const sku = product.code || product.stockCode || product.stockcode || "";
          const name = product.name || product.title || it.productName || "Pazarama Ürün";
          let productDoc = null;
          if (sku) {
            productDoc = await Product.findOne({
              companyId: companyIdObj,
              $or: [{ barcode: sku }, { sku }],
            }).lean();
          }
          if (!productDoc && product.productId) {
            productDoc = await Product.findOne({ companyId: companyIdObj, pazaramaProductId: product.productId }).lean();
          }
          saleItems.push({
            productId: productDoc?._id || null,
            name,
            barcode: sku,
            sku,
            quantity: qty,
            unitPrice: unitPrice / qty,
            vatRate: Number(product.vatRate ?? 20),
          });
          if (productDoc?._id) affectedProductIds.push(productDoc._id);
        }

        if (!saleItems.length) {
          failed.push({ orderNumber, error: "Sipariş kalemi yok" });
          continue;
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
        const totalTRY = getValue(o.orderAmount) > 0 ? getValue(o.orderAmount) : subTotal;

        for (const it of normalizedItems) {
          if (it.productId) {
            await Product.findByIdAndUpdate(it.productId, { $inc: { stock: -it.quantity } });
          }
        }

        const orderDate = o.orderDate ? new Date(o.orderDate) : new Date();

        await Transaction.create({
          userId: userIdStr,
          companyId: companyIdStr,
          accountId: cari._id,
          accountName: fullName !== "Pazarama Müşteri" ? fullName.trim() : "",
          type: "sale",
          saleNo,
          date: orderDate,
          paymentMethod: "open",
          note: "Pazarama siparişi",
          currency: "TRY",
          fxRate: 1,
          items: normalizedItems,
          totalTRY,
          direction: "borc",
          amount: totalTRY,
        });

        await createPazaryeriBorcAndUpdateBakiye({
          pazaryeriAd: "Pazarama",
          companyIdObj,
          companyIdStr,
          userIdStr,
          userIdObj,
          saleNo,
          totalTRY,
          note: `Pazarama sipariş ${orderNumber}`,
          date: orderDate,
        });

        salesCreated++;
      } catch (err) {
        failed.push({ orderNumber, error: err.message });
      }
    }

    if (affectedProductIds.length) {
      pushStockToMarketplaces(affectedProductIds, { companyId: companyIdStr, userId: userIdStr });
    }

    return res.status(200).json({
      success: true,
      message: `${salesCreated} sipariş ERP'ye aktarıldı, ${salesSkipped} zaten aktarılmış.`,
      salesCreated,
      salesSkipped,
      failed,
    });
  } catch (err) {
    console.error("[Pazarama] create-erp hata:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
