// pages/api/cari/ekstre-pdf.js
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import dbConnect from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import Cari from "@/models/Cari";

import { createPdf } from "@/lib/pdf/PdfEngine";
import { renderCariEkstrePdf } from "@/lib/pdf/templates/cari";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") return res.status(405).end();

    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
    if (!token) return res.status(401).end("Yetkisiz");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded.id || decoded._id;
    const companyId = decoded.companyId || null;
    const role = decoded.role || "user";

    const { accountId, start, end } = req.query;
    if (!accountId || !start || !end) return res.status(400).end("Parametre eksik");

    await dbConnect();
    const db = mongoose.connection.db;
    const accountObjectId = new mongoose.Types.ObjectId(accountId);

    let company = null;
    try {
      if (companyId) {
        company = await db.collection("company_settings").findOne({
          $or: [
            { companyId: new mongoose.Types.ObjectId(companyId) },
            { companyId: companyId }
          ]
        });
      }
      if (!company && userId) {
        company = await db.collection("company_settings").findOne({
          $or: [
            { userId: new mongoose.Types.ObjectId(String(userId)) },
            { userId: String(userId) }
          ]
        });
      }
    } catch (e) {
      company = null;
    }

    let cari = await Cari.findOne({ _id: accountObjectId }).lean();
    if (!cari) {
      return res.status(404).end("Cari bulunamadı");
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);

    const trxFilter = {
      accountId: accountObjectId,
      date: { $gte: startDate, $lte: endDate },
      isDeleted: { $ne: true },
      status: { $ne: "cancelled" },
    };

    if (role !== "admin") {
      const orConditions = [];
      if (companyId) {
        orConditions.push(
          { companyId: new mongoose.Types.ObjectId(companyId) },
          { companyId: companyId }
        );
      }
      if (userId) {
        orConditions.push(
          { userId: new mongoose.Types.ObjectId(String(userId)) },
          { userId: String(userId) }
        );
      }
      orConditions.push({
        $and: [
          { $or: [{ companyId: "" }, { companyId: null }, { companyId: { $exists: false } }] },
          { userId: String(userId) }
        ]
      });
      if (orConditions.length > 0) {
        trxFilter.$or = orConditions;
      }
    }

    const transactions = await Transaction.find(trxFilter).sort({ date: 1, createdAt: 1 }).lean();
    console.log(`✅ ${transactions.length} transaction bulundu`);

    let bakiye = 0;
    let totalBorc = 0;
    let totalAlacak = 0;
    
    const currencyTotals = {
      TRY: { borc: 0, alacak: 0, borcTL: 0, alacakTL: 0 },
      USD: { borc: 0, alacak: 0, borcTL: 0, alacakTL: 0 },
      EUR: { borc: 0, alacak: 0, borcTL: 0, alacakTL: 0 }
    };

    const rows = transactions.map((t) => {
      const currency = t.currency || "TRY";
      const fxRate = Number(t.fxRate || 1);
      
      let borcDV = 0;
      let alacakDV = 0;
      let borcTL = 0;
      let alacakTL = 0;

      if (currency === "TRY") {
        const tutar = Number(t.amount ?? t.totalTRY ?? t.total ?? 0);
        
        if (t.direction === "borc") {
          borcTL = tutar;
          borcDV = 0;
        } else {
          alacakTL = tutar;
          alacakDV = 0;
        }
      } else {
        const amountTRY = Number(t.totalTRY ?? t.amountTRY ?? t.amount ?? 0) || 0;
        const amountFCYraw = Number(t.totalFCY ?? t.amountFCY ?? 0) || 0;
        const dovizMiktar = amountFCYraw > 0 ? amountFCYraw : (fxRate > 0 ? amountTRY / fxRate : 0);
        const tlKarsilik = amountTRY > 0 ? amountTRY : dovizMiktar * fxRate;

        if (t.direction === "borc") {
          borcDV = dovizMiktar;
          borcTL = tlKarsilik;
        } else {
          alacakDV = dovizMiktar;
          alacakTL = tlKarsilik;
        }
      }

      bakiye = bakiye + borcTL - alacakTL;
      
      totalBorc += borcTL;
      totalAlacak += alacakTL;

      if (!currencyTotals[currency]) {
        currencyTotals[currency] = { borc: 0, alacak: 0, borcTL: 0, alacakTL: 0 };
      }
      
      if (currency === "TRY") {
        currencyTotals[currency].borc += borcTL;
        currencyTotals[currency].alacak += alacakTL;
        currencyTotals[currency].borcTL += borcTL;
        currencyTotals[currency].alacakTL += alacakTL;
      } else {
        currencyTotals[currency].borc += borcDV;
        currencyTotals[currency].alacak += alacakDV;
        currencyTotals[currency].borcTL += borcTL;
        currencyTotals[currency].alacakTL += alacakTL;
      }

      let aciklama = "-";
      if (t.type === "sale") aciklama = "Satış";
      else if (t.type === "purchase") aciklama = "Alış";
      else if (t.type === "sale_cancel") aciklama = "Satış İptali";
      else if (t.type === "sale_return") aciklama = "Satış İadesi";
      else if (t.direction === "alacak") aciklama = "Tahsilat";
      else if (t.direction === "borc") aciklama = "Ödeme";

      return {
        tarih: t.date || t.createdAt || new Date(),
        aciklama,
        currency,
        fxRate,
        borc: borcTL,
        alacak: alacakTL,
        bakiye,
        borcDV,
        alacakDV,
      };
    });

    const doc = createPdf(res, {
      title: "CARİ EKSTRESİ",
      subtitle: `${start} - ${end}`,
      inline: true,
      layout: "landscape",
    });

    renderCariEkstrePdf(doc, {
      company,
      cari: cari.unvan || cari.firmaAdi || cari.ad || cari.title || "-",
      start,
      end,
      rows,
      totalBorc,
      totalAlacak,
      bakiye,
      currencyTotals,
    });

    doc.end();
  } catch (err) {
    console.error("CARI EKSTRE PDF ERROR:", err);
    if (!res.headersSent) res.status(500).end("PDF oluşturulamadı");
  }
}