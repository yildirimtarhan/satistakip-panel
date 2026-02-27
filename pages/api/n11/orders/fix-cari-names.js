/**
 * "N11 Müşteri" olan carileri, bağlı N11 siparişlerindeki gerçek müşteri adıyla toplu günceller.
 * POST /api/n11/orders/fix-cari-names
 * Body: {} (opsiyonel dryRun: true ile sadece rapor döner, güncelleme yapılmaz)
 */
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Cari from "@/models/Cari";
import N11Order from "@/models/N11Order";

function getRealNameFromOrder(order) {
  if (!order) return null;
  const raw = order.raw || {};
  const buyer = raw.buyer || {};
  const recipient = raw.recipient;
  const recipientStr = typeof recipient === "string" ? recipient : (recipient && recipient.fullName) || "";
  const name =
    order.buyerName ||
    buyer.fullName ||
    recipientStr ||
    raw.buyerName ||
    raw.shippingAddress?.fullName ||
    raw.billingAddress?.fullName ||
    "";
  const trimmed = String(name || "").trim();
  if (!trimmed || trimmed === "N11 Müşteri") return null;
  return trimmed;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: "Token gerekli" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyId = decoded.companyId || decoded.companyIdStr;
    if (!companyId) {
      return res.status(400).json({ success: false, message: "companyId bulunamadı" });
    }

    const companyIdObj = new mongoose.Types.ObjectId(companyId);
    const dryRun = req.body?.dryRun === true;

    await dbConnect();

    const cariler = await Cari.find({
      companyId: companyIdObj,
      $or: [
        { ad: "N11 Müşteri" },
        { ad: { $regex: /^n11\s*müşteri$/i } },
      ],
    }).lean();

    const results = [];
    let updated = 0;
    const updatedIds = new Set();

    for (const cari of cariler) {
      let order = await N11Order.findOne({
        companyId: companyIdObj,
        $or: [{ accountId: cari._id }, { cariId: cari._id }],
      })
        .sort({ updatedAt: -1 })
        .lean();

      if (!order && cari.n11CustomerId) {
        order = await N11Order.findOne({
          companyId: companyIdObj,
          n11CustomerId: String(cari.n11CustomerId),
        })
          .sort({ updatedAt: -1 })
          .lean();
      }

      let realName = order ? getRealNameFromOrder(order) : null;

      if (realName) {
        if (!dryRun) {
          await Cari.findByIdAndUpdate(cari._id, { $set: { ad: realName } });
          updated++;
          updatedIds.add(cari._id.toString());
        }
        results.push({
          cariId: cari._id.toString(),
          oldName: cari.ad,
          newName: realName,
          orderNumber: order?.orderNumber || null,
          updated: !dryRun,
        });
      } else {
        results.push({
          cariId: cari._id.toString(),
          oldName: cari.ad,
          newName: null,
          orderNumber: order?.orderNumber || null,
          updated: false,
          reason: order ? "Siparişte müşteri adı yok" : "Bağlı N11 siparişi yok",
        });
      }
    }

    const stillMissing = cariler.filter((c) => !updatedIds.has(c._id.toString()));
    if (stillMissing.length > 0) {
      const ordersWithBuyer = await N11Order.find({
        companyId: companyIdObj,
        $or: [
          { "raw.buyer.fullName": { $exists: true, $ne: "" } },
          { "raw.recipient": { $exists: true } },
          { buyerName: { $exists: true, $ne: "" } },
        ],
      })
        .select("raw buyerName orderNumber")
        .lean();

      const normalizePhone = (s) => String(s || "").replace(/\D/g, "").slice(-10);
      const normalizeEmail = (s) => String(s || "").trim().toLowerCase();

      for (const cari of stillMissing) {
        const cariPhone = normalizePhone(cari.telefon);
        const cariEmail = normalizeEmail(cari.email);
        if (!cariPhone && !cariEmail) continue;

        for (const ord of ordersWithBuyer) {
          const raw = ord.raw || {};
          const buyer = raw.buyer || {};
          const rec = raw.recipient;
          const ordEmail = normalizeEmail(buyer.email || (rec && rec.email) || "");
          const ordPhone = normalizePhone(buyer.gsm || (rec && rec.gsm) || raw.shippingAddress?.gsm || "");
          const match = (cariEmail && ordEmail && cariEmail === ordEmail) || (cariPhone && ordPhone && cariPhone === ordPhone);
          if (!match) continue;

          const name = getRealNameFromOrder(ord);
          if (!name) continue;

          if (!dryRun) {
            await Cari.findByIdAndUpdate(cari._id, { $set: { ad: name } });
            updated++;
          }
          const existing = results.find((r) => r.cariId === cari._id.toString());
          if (existing) {
            existing.newName = name;
            existing.orderNumber = ord.orderNumber;
            existing.updated = !dryRun;
            existing.reason = undefined;
          } else {
            results.push({
              cariId: cari._id.toString(),
              oldName: cari.ad,
              newName: name,
              orderNumber: ord.orderNumber || null,
              updated: !dryRun,
              matchedBy: "email/phone",
            });
          }
          break;
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: dryRun
        ? `${cariler.length} "N11 Müşteri" cari tarandı (dry run, güncelleme yapılmadı)`
        : `${updated} cari güncellendi, ${cariler.length - updated} güncellenemedi`,
      total: cariler.length,
      updated,
      dryRun,
      results: results.slice(0, 100),
    });
  } catch (err) {
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, message: "Geçersiz token" });
    }
    console.error("[fix-cari-names]", err);
    return res.status(500).json({ success: false, message: err?.message || "Sunucu hatası" });
  }
}
