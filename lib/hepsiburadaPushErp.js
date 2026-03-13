/**
 * Hepsiburada siparişini ERP'ye otomatik aktarır.
 * Webhook ve push-erp API tarafından kullanılır.
 * @param {object} orderDoc - hb_orders koleksiyonundan sipariş doc
 * @param {{ companyIdStr: string, userIdStr: string, userIdObj: object }} ctx
 * @returns {{ ok: boolean, saleNo?: string, error?: string, skipped?: boolean }}
 */
import dbConnect from "@/lib/dbConnect";
import { connectToDatabase } from "@/lib/mongodb";
import mongoose from "mongoose";
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

export async function processHbOrderToErp(orderDoc, ctx) {
  const { companyIdStr, userIdStr } = ctx;
  if (!companyIdStr || !userIdStr) return { ok: false, error: "companyId ve userId gerekli" };

  await dbConnect();
  const { db } = await connectToDatabase();
  const col = db.collection("hb_orders");
  const companyIdObj = new mongoose.Types.ObjectId(companyIdStr);
  const userIdObj = mongoose.Types.ObjectId.isValid(userIdStr) ? new mongoose.Types.ObjectId(userIdStr) : null;

  const orderNumber = orderDoc?.data?.orderNumber || orderDoc?.orderNumber;
  if (!orderNumber) return { ok: false, error: "Sipariş numarası yok" };

  const saleNo = `HB-${orderNumber}`;

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
    return { ok: true, skipped: true, saleNo };
  }

  const { fullName, email, phone, hbCustomerId } = extractBuyerFromHbOrder(orderDoc);
  const or = [];
  if (hbCustomerId) or.push({ hbCustomerId });
  if (email) or.push({ email });
  if (phone) or.push({ telefon: phone });

  let cari = null;
  if (or.length) cari = await Cari.findOne({ companyId: companyIdObj, $or: or });
  if (!cari) {
    cari = await Cari.create({
      companyId: companyIdObj,
      userId: userIdObj || companyIdObj,
      ad: fullName,
      email: email || "",
      telefon: phone || "",
      hbCustomerId: hbCustomerId || "",
      tur: "Müşteri",
    });
  } else {
    let changed = false;
    if (hbCustomerId && !cari.hbCustomerId) { cari.hbCustomerId = hbCustomerId; changed = true; }
    if (fullName && fullName !== "Hepsiburada Müşteri" && String(fullName).trim()) {
      if (String(cari.ad || "").trim() !== String(fullName).trim()) { cari.ad = fullName.trim(); changed = true; }
    }
    if (email && !cari.email) { cari.email = email; changed = true; }
    if (phone && !cari.telefon) { cari.telefon = phone; changed = true; }
    if (changed) await cari.save();
  }

  const lineItems = extractLinesFromHbOrder(orderDoc);
  if (!lineItems.length) return { ok: false, error: "Sipariş kalemi yok" };

  const saleItems = [];
  for (const it of lineItems) {
    if (it.quantity <= 0) continue;
    let product = null;
    if (it.sku) product = await Product.findOne({ companyId: companyIdObj, $or: [{ sku: it.sku }, { barcode: it.sku }] }).lean();
    if (!product?._id && it.barcode) product = await Product.findOne({ companyId: companyIdObj, barcode: it.barcode }).lean();
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

  for (const it of normalizedItems) {
    if (it.productId) await Product.findByIdAndUpdate(it.productId, { $inc: { stock: -it.quantity } });
  }

  await Transaction.create({
    userId: userIdStr,
    companyId: companyIdStr,
    accountId: cari._id,
    accountName: fullName && fullName !== "Hepsiburada Müşteri" ? fullName.trim() : "",
    type: "sale",
    saleNo,
    date: orderDoc.fetchedAt ? new Date(orderDoc.fetchedAt) : new Date(),
    paymentMethod: "open",
    note: "Hepsiburada siparişi",
    currency: "TRY",
    fxRate: 1,
    items: normalizedItems,
    totalTRY,
    direction: "borc",
    amount: totalTRY,
  });

  await createPazaryeriBorcAndUpdateBakiye({
    pazaryeriAd: "Hepsiburada",
    companyIdObj,
    companyIdStr,
    userIdStr,
    userIdObj: userIdObj || companyIdObj,
    saleNo,
    totalTRY,
    note: `Hepsiburada sipariş ${orderNumber}`,
    date: orderDoc.fetchedAt ? new Date(orderDoc.fetchedAt) : new Date(),
  });

  await col.updateOne(
    { $or: [{ orderNumber }, { "data.orderNumber": orderNumber }] },
    { $set: { erpPushed: true, erpSaleNo: saleNo, companyId: companyIdStr, userId: userIdStr } }
  );

  const affectedIds = normalizedItems.filter((i) => i.productId).map((i) => i.productId);
  if (affectedIds.length) pushStockToMarketplaces(affectedIds, { companyId: companyIdStr, userId: userIdStr });

  return { ok: true, saleNo };
}

/** HB merchantId ile companyId ve userId bulur */
export async function getCompanyUserByHepsiburadaMerchantId(merchantId) {
  if (!merchantId) return null;
  const { db } = await connectToDatabase();
  const settings = await db.collection("settings").findOne({
    "hepsiburada.merchantId": String(merchantId).trim(),
  });
  if (!settings?.companyId) return null;
  const companyIdStr = String(settings.companyId);
  const user = await db.collection("users").findOne({ companyId: companyIdStr }, { projection: { _id: 1 } });
  const userIdStr = user ? String(user._id) : companyIdStr;
  return { companyIdStr, userIdStr };
}
