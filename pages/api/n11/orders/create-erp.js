import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import { parseN11Date } from "@/utils/formatters";

import N11Order from "@/models/N11Order";
import Cari from "@/models/Cari";
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";
import { createPazaryeriBorcAndUpdateBakiye } from "@/lib/pazaryeriCari";
import { getN11OrderDetailByOrderNumber } from "@/lib/marketplaces/n11Service";

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

function extractOrderItems(raw = {}) {
  const items =
    raw?.orderItemList?.orderItem ||
    raw?.itemList?.item ||
    raw?.items?.item ||
    raw?.orderItems ||
    raw?.lines ||
    [];
  return ensureArray(items);
}

function extractBuyerFromOrderDoc(orderDoc) {
  const raw = orderDoc?.raw || {};
  const buyer = raw?.buyer || {};
  const recipient = raw?.recipient;
  const recipientObj = recipient && typeof recipient === "object" ? recipient : {};
  const shipping = raw?.shippingAddress || {};
  const billing = raw?.billingAddress || {};

  const fullName =
    orderDoc?.buyerName ||
    buyer.fullName ||
    (typeof recipient === "string" ? recipient : recipientObj.fullName) ||
    shipping.fullName ||
    billing.fullName ||
    "N11 Müşteri";

  const email = String(orderDoc?.buyerEmail || buyer.email || recipientObj.email || "").trim().toLowerCase();
  const phone = normalizePhoneTR(orderDoc?.buyerPhone || buyer.gsm || recipientObj.gsm || buyer.phone || "");
  const n11CustomerId = String(orderDoc?.n11CustomerId || buyer.id || buyer.customerId || raw.customerId || "");

  return { fullName, email, phone, n11CustomerId };
}

async function resolveCari({ session, companyIdObj, userIdObj, orderDoc }) {
  if (orderDoc?.accountId) {
    const c = await Cari.findOne({ _id: orderDoc.accountId, companyId: companyIdObj }).session(session);
    if (c) return c;
  }

  const { fullName, email, phone, n11CustomerId } = extractBuyerFromOrderDoc(orderDoc);

  const or = [];
  if (n11CustomerId) or.push({ n11CustomerId });
  if (email) or.push({ email });
  if (phone) or.push({ telefon: phone });

  let cari = null;
  if (or.length) {
    cari = await Cari.findOne({ companyId: companyIdObj, $or: or }).session(session);
  }

  if (!cari) {
    cari = await Cari.create([{
      companyId: companyIdObj,
      userId: userIdObj,
      ad: fullName,
      email: email || "",
      telefon: phone || "",
      n11CustomerId: n11CustomerId || "",
    }], { session }).then((arr) => arr[0]);
  } else {
    let changed = false;
    if (n11CustomerId && !cari.n11CustomerId) { cari.n11CustomerId = n11CustomerId; changed = true; }
    if (fullName && fullName !== "N11 Müşteri" && String(fullName).trim()) {
      if (String(cari.ad || "").trim() !== String(fullName).trim()) { cari.ad = fullName.trim(); changed = true; }
    }
    if (email && !cari.email) { cari.email = email; changed = true; }
    if (phone && !cari.telefon) { cari.telefon = phone; changed = true; }
    if (changed) await cari.save({ session });
  }

  return cari;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

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

    const { orderId, orderNumber } = req.body || {};
    if (!orderId && !orderNumber) {
      return res.status(400).json({ success: false, message: "orderId veya orderNumber zorunlu" });
    }

    const session = await mongoose.startSession();

    const result = await session.withTransaction(async () => {
      const query = { companyId: companyIdObj };
      if (orderId != null) query.orderId = Number(orderId);
      if (orderNumber) query.orderNumber = String(orderNumber);

      let orderDoc = await N11Order.findOne(query).session(session);
      if (!orderDoc) throw new Error("Sipariş bulunamadı (önce Senkronize Et çalışmalı)");

      if (orderDoc.erpPushed && orderDoc.erpTransactionId) {
        return { already: true, saleNo: orderDoc.erpSaleNo, transactionId: orderDoc.erpTransactionId };
      }

      const raw = orderDoc.raw || {};
      const hasBuyerName = raw?.buyer?.fullName || raw?.recipient || raw?.buyerName || raw?.shippingAddress?.fullName || raw?.billingAddress?.fullName;
      if (!hasBuyerName && orderDoc.orderNumber) {
        try {
          const liveOrder = await getN11OrderDetailByOrderNumber(companyIdStr, userIdStr, orderDoc.orderNumber);
          if (liveOrder) {
            orderDoc.raw = { ...raw, ...liveOrder };
            orderDoc.buyerName = liveOrder.recipient || liveOrder.buyerName || liveOrder.buyer?.fullName;
            orderDoc.buyerEmail = liveOrder.buyer?.email || "";
            orderDoc.buyerPhone = liveOrder.buyer?.gsm || liveOrder.shippingAddress?.gsm || "";
          }
        } catch (e) {
          console.warn("[create-erp] N11 detay çekilemedi:", e?.message);
        }
      }

      const cari = await resolveCari({ session, companyIdObj, userIdObj, orderDoc });

      // Satış oluştur (Transaction)
      const saleNo = `N11-${orderDoc.orderNumber}`;

      const exists = await Transaction.findOne({
        type: "sale",
        saleNo,
        userId: userIdStr,
        isDeleted: { $ne: true },
      }).session(session).lean();

      if (exists) {
        orderDoc.erpPushed = true;
        orderDoc.erpPushedAt = new Date();
        orderDoc.erpSaleNo = saleNo;
        orderDoc.erpTransactionId = exists._id;
        orderDoc.accountId = cari._id;
        orderDoc.cariId = cari._id;
        await orderDoc.save({ session });
        return { already: true, saleNo, transactionId: exists._id };
      }

      const rawItems = extractOrderItems(orderDoc.raw || {});
      if (!rawItems.length) throw new Error("Sipariş kalemi bulunamadı");

      // Ürün eşleştirme (best-effort)
      const lines = [];
      const missing = [];
      for (const it of rawItems) {
        const sku = String(it.productSellerCode || it.sellerProductCode || it.stockCode || it.sku || "").trim();
        const barcode = String(it.barcode || "").trim();
        const qty = Number(it.quantity || 1);
        const unitPrice = Number(it.price ?? it.unitPrice ?? it.sellerInvoiceAmount ?? 0);
        const name = it.productName || it.title || sku || barcode || "N11 Ürün";

        let product = null;
        if (sku) product = await Product.findOne({ companyId: companyIdObj, sku }).session(session).lean();
        if (!product?._id && barcode) product = await Product.findOne({ companyId: companyIdObj, barcode }).session(session).lean();

        if (!product?._id) missing.push(sku || barcode || name);

        lines.push({
          productId: product?._id || null,
          name: product?.name || name,
          barcode: product?.barcode || barcode || "",
          sku: product?.sku || sku || "",
          quantity: qty,
          unitPrice,
          vatRate: Number(product?.vatRate ?? 20),
        });
      }

      // totals
      let subTotal = 0;
      let vatTotal = 0;
      const normalizedItems = lines.map((i) => {
        const lineSub = Number(i.unitPrice || 0) * Number(i.quantity || 1);
        const lineVat = lineSub * (Number(i.vatRate || 0) / 100);
        subTotal += lineSub;
        vatTotal += lineVat;
        return { ...i, total: lineSub + lineVat, currency: "TRY", fxRate: 1 };
      });

      const totalTRY = subTotal + vatTotal;

      const saleDate = parseN11Date(orderDoc.raw?.createDate) || new Date();
      const tx = await Transaction.create([{
        userId: userIdStr,
        companyId: companyIdStr,
        createdBy: userIdStr,
        type: "sale",
        saleNo,
        accountId: cari._id,
        accountName: String(cari.ad || "").trim() || extractBuyerFromOrderDoc(orderDoc).fullName,
        date: saleDate,
        paymentMethod: "open",
        note: "N11 siparişinden satış",
        currency: "TRY",
        fxRate: 1,
        items: normalizedItems,
        totalTRY,
        direction: "borc",
        amount: totalTRY,
      }], { session }).then((arr) => arr[0]);

      // Pazaryeri muhasebe: N11 carisine borç (platformun size borcu)
      await createPazaryeriBorcAndUpdateBakiye({
        pazaryeriAd: "N11",
        companyIdObj,
        companyIdStr,
        userIdStr,
        userIdObj,
        saleNo,
        totalTRY,
        note: `N11 sipariş ${orderDoc.orderNumber || orderDoc.orderId}`,
        date: saleDate,
        session,
      });

      // stok düş (sadece eşleşen ürünlerde)
      for (const i of normalizedItems) {
        if (i.productId) {
          await Product.findByIdAndUpdate(i.productId, { $inc: { stock: -i.quantity } }).session(session);
        }
      }

      orderDoc.accountId = cari._id;
      orderDoc.cariId = cari._id;
      orderDoc.erpPushed = true;
      orderDoc.erpPushedAt = new Date();
      orderDoc.erpSaleNo = saleNo;
      orderDoc.erpTransactionId = tx._id;
      if (missing.length) {
        orderDoc.note = `ERP satış oluşturuldu fakat eşleşmeyen ürünler var: ${missing.slice(0, 10).join(", ")}`;
      }
      await orderDoc.save({ session });

      return { already: false, saleNo, transactionId: tx._id };
    });

    session.endSession();
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    console.error("CREATE ERP ERROR:", err);
    return res.status(500).json({ success: false, message: err?.message || String(err) });
  }
}
