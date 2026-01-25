// /pages/api/n11/orders/create-erp.js (veya /app/api/...)
// Mongoose session ile transaction

import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

import Cari from "@/models/Cari";
import Sale from "@/models/Sale";
import Product from "@/models/Product";
import StockLog from "@/models/StockLog";
import OrderN11 from "@/models/OrderN11"; // varsa

function normalizePhoneTR(phone = "") {
  const digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length >= 12) return digits;
  if (digits.startsWith("0") && digits.length >= 11) return "9" + digits;
  if (digits.length === 10) return "90" + digits;
  return digits;
}

async function resolveCari({ session, companyId, order, forceCariId }) {
  if (forceCariId) {
    const c = await Cari.findOne({ _id: forceCariId, companyId }).session(session);
    if (!c) throw new Error("forceCariId cari bulunamadı");
    return c;
  }

  if (order.cariId) {
    const c = await Cari.findOne({ _id: order.cariId, companyId }).session(session);
    if (c) return c;
  }

  const identityNo = order.customer?.identityNo || order.customer?.taxNo || null;
  const email = (order.customer?.email || "").trim().toLowerCase();
  const phone = normalizePhoneTR(order.customer?.phone || "");

  let cari = null;

  if (identityNo) {
    cari = await Cari.findOne({ companyId, identityNo }).session(session);
    if (cari) return cari;
  }

  if (email) {
    cari = await Cari.findOne({ companyId, email }).session(session);
    if (cari) return cari;
  }

  if (phone) {
    cari = await Cari.findOne({ companyId, phone }).session(session);
    if (cari) return cari;
  }

  // Bulunamadı → oluştur
  const newCari = await Cari.create([{
    companyId,
    name: order.customer?.fullName || order.customer?.name || "N11 Müşteri",
    email: email || null,
    phone: phone || null,
    identityNo: identityNo || null,
    address: order.shippingAddress || null,
    source: "N11",
    createdFromOrderId: order.orderId || order._id
  }], { session });

  return newCari[0];
}

function generateSaleNo() {
  // basit örnek — sen muhtemelen CompanySettings üzerinden sequence tutuyorsun
  const yyyy = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 900000 + 100000);
  return `SAT-${yyyy}-${rand}`;
}

async function buildSaleLines({ session, companyId, order }) {
  // order.items: [{ sku, quantity, price, title }]
  // Ürün eşle: SKU -> Product
  const lines = [];
  for (const it of order.items || []) {
    const sku = (it.sku || "").trim();
    const qty = Number(it.quantity || 0);

    if (!sku) throw new Error("Sipariş kaleminde SKU yok");
    if (qty <= 0) throw new Error(`Geçersiz qty: ${sku}`);

    const product = await Product.findOne({ companyId, sku }).session(session);
    if (!product) throw new Error(`Ürün bulunamadı (SKU): ${sku}`);

    const unitPrice = Number(it.unitPrice ?? it.price ?? 0);
    const lineTotal = unitPrice * qty;

    lines.push({
      productId: product._id,
      sku: product.sku,
      name: product.title || it.title || sku,
      quantity: qty,
      unitPrice,
      total: lineTotal,
      vatRate: Number(it.vatRate ?? product.vatRate ?? 20)
    });
  }
  return lines;
}

async function decreaseStockAndLog({ session, companyId, userId, saleId, saleNo, lines }) {
  for (const ln of lines) {
    // Stok kontrol
    const p = await Product.findOne({ _id: ln.productId, companyId }).session(session);
    if (!p) throw new Error("Ürün kayboldu?");
    const newStock = Number(p.stock || 0) - Number(ln.quantity || 0);
    if (newStock < 0) {
      throw new Error(`Yetersiz stok: ${p.sku} (mevcut ${p.stock}, istenen ${ln.quantity})`);
    }

    p.stock = newStock;
    await p.save({ session });

    await StockLog.create([{
      companyId,
      productId: p._id,
      type: "OUT",
      quantity: ln.quantity,
      reason: "N11 siparişinden satış",
      refType: "SALE",
      refId: saleId,
      note: saleNo,
      createdBy: userId
    }], { session });
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, message: "Method not allowed" });

  try {
    await dbConnect();

    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ ok: false, message: "Token yok" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ ok: false, message: "Token geçersiz" });
    }

    const userId = decoded.userId || decoded.id;
    const companyId = decoded.companyId;
    if (!companyId) return res.status(400).json({ ok: false, message: "companyId bulunamadı" });

    const { orderId, forceCariId } = req.body || {};
    if (!orderId) return res.status(400).json({ ok: false, message: "orderId zorunlu" });

    const session = await mongoose.startSession();

    const result = await session.withTransaction(async () => {
      // 1) Order getir (DB’de varsa)
      const order = await OrderN11.findOne({ companyId, orderId }).session(session);
      if (!order) throw new Error("Sipariş bulunamadı");

      // idempotency: daha önce oluşturulduysa dön
      if (order.erpStatus === "CREATED" && order.erpSaleId) {
        return {
          already: true,
          cariId: String(order.cariId),
          saleId: String(order.erpSaleId),
          saleNo: order.erpSaleNo
        };
      }

      // 2) Cari resolve
      const cari = await resolveCari({ session, companyId, order, forceCariId });

      // 3) Satış satırlarını kur
      const lines = await buildSaleLines({ session, companyId, order });

      const saleNo = generateSaleNo();
      const total = lines.reduce((a, b) => a + Number(b.total || 0), 0);

      // 4) Sale create
      const saleDocArr = await Sale.create([{
        companyId,
        saleNo,
        cariId: cari._id,
        source: "N11",
        sourceOrderId: order.orderId,
        lines,
        total,
        currency: order.currency || "TRY",
        status: "CONFIRMED",
        createdBy: userId
      }], { session });

      const saleDoc = saleDocArr[0];

      // 5) Stok düş + log
      await decreaseStockAndLog({
        session, companyId, userId,
        saleId: saleDoc._id,
        saleNo,
        lines
      });

      // 6) Order güncelle
      order.cariId = cari._id;
      order.erpStatus = "CREATED";
      order.erpSaleId = saleDoc._id;
      order.erpSaleNo = saleNo;
      order.createdSaleAt = new Date();
      await order.save({ session });

      return {
        already: false,
        cariId: String(cari._id),
        saleId: String(saleDoc._id),
        saleNo
      };
    });

    session.endSession();
    return res.status(200).json({ ok: true, ...result });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: err.message || "create-erp hata" });
  }
}
