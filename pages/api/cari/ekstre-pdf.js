import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";

import Transaction from "@/models/Transaction";
import Cari from "@/models/Cari";

import { createPdf } from "@/lib/pdf/PdfEngine";
import { renderCariEkstrePdf } from "@/lib/pdf/templates/cari";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).end();
    }

    // 🔐 AUTH
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return res.status(401).end("Yetkisiz");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded.id || decoded._id;
    const companyId = decoded.companyId || null;
    const role = decoded.role || "user";

    const { accountId, start, end } = req.query;
    if (!accountId || !start || !end) {
      return res.status(400).end("Parametre eksik");
    }

    const { db } = await connectToDatabase();

    const accountObjectId = new mongoose.Types.ObjectId(accountId);

    // 🧾 CARİ
    const cari = await Cari.findById(accountObjectId).lean();
    if (!cari) {
      return res.status(404).end("Cari bulunamadı");
    }

    // 🏢 FİRMA AYARLARI
    let company = {
      name: "SatışTakip ERP",
      taxOffice: "",
      taxNo: "",
      phone: "",
      email: "",
      address: "",
      logo: null,
    };

    // ⚠️ Firma ayarları USER BAZLI tutuluyor
    if (userId) {
      const companySettings = await db
        .collection("company_settings")
        .findOne({ userId });

      if (companySettings) {
        company = {
          name: companySettings.firmaAdi || company.name,
          taxOffice: companySettings.vergiDairesi || "",
          taxNo: companySettings.vergiNo || "",
          phone: companySettings.telefon || "",
          email: companySettings.eposta || companySettings.email || "",
          address: companySettings.adres || "",
          logo: companySettings.logo || null,
        };
      }
    }

    // 📅 TARİH
    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);

    // 🔎 TRANSACTION FİLTRE
    const trxFilter = {
      accountId: accountObjectId,
      date: { $gte: startDate, $lte: endDate },
    };

    if (role !== "admin" && companyId) {
      trxFilter.companyId = new mongoose.Types.ObjectId(companyId);
    }

    const transactions = await Transaction.find(trxFilter)
      .sort({ date: 1 })
      .lean();

    // 🧮 EKSTRE HESAPLARI
    let bakiye = 0;
    let totalBorc = 0;
    let totalAlacak = 0;

    const rows = transactions.map((t) => {
      const amount = Number(t.amount || t.totalTRY || 0);
      const borc = t.direction === "borc" ? amount : 0;
      const alacak = t.direction === "alacak" ? amount : 0;

      bakiye = bakiye + borc - alacak;
      totalBorc += borc;
      totalAlacak += alacak;

      // ✅ PROFESYONEL AÇIKLAMA (type bazlı)
      let aciklama = "-";

      if (t.type === "sale") aciklama = "Satış";
      else if (t.type === "purchase") aciklama = "Alış";
      else if (t.type === "sale_cancel") aciklama = "Satış İptali";
      else if (t.type === "sale_return") aciklama = "Satış İadesi";
      else if (t.direction === "alacak") aciklama = "Tahsilat";
      else if (t.direction === "borc") aciklama = "Ödeme";

      return {
        tarih: t.date,
        aciklama,
        borc,
        alacak,
        bakiye,
      };
    });

    // 📄 PDF
    const doc = createPdf(res, {
      title: "CARİ EKSTRESİ",
      subtitle: `${start} - ${end}`,
      inline: true,
      layout: "landscape",
    });

    renderCariEkstrePdf(doc, {
      company,
      cari: cari.unvan || cari.firmaAdi || cari.ad || "-",
      start,
      end,
      rows,
      totalBorc,
      totalAlacak,
      bakiye,
    });

    doc.end();
  } catch (err) {
    console.error("CARI EKSTRE PDF ERROR:", err);
    if (!res.headersSent) {
      res.status(500).end("PDF oluşturulamadı");
    }
  }
}
