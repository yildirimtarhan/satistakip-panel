import jwt from "jsonwebtoken";
import dbConnect, { connectToDatabase } from "@/lib/mongodb";

import Transaction from "@/models/Transaction";
import Cari from "@/models/Cari";

import tahsilatMakbuzuTemplate from "../../../lib/pdf/templates/tahsilatMakbuzu";

const fmt = (n) =>
  Number(n || 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET desteklenir" });
  }

  try {
    await dbConnect();

    // 🔐 TOKEN (header veya query)
    const auth = req.headers.authorization || "";
    const headerToken = auth.startsWith("Bearer ") ? auth.split(" ")[1] : "";
    const queryToken = req.query.token || "";
    const token = headerToken || queryToken;

    if (!token) return res.status(401).json({ message: "Token yok" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Geçersiz token" });
    }

    const userId = decoded.userId || decoded._id || decoded.id;
    const companyId = decoded.companyId || null;

    if (!userId) return res.status(401).json({ message: "Kullanıcı bulunamadı" });

    const { id } = req.query;
    if (!id) return res.status(400).json({ message: "id gerekli" });

    console.log("PDF REQUEST:", { id, userId, companyId });

    // ✅ DÜZELTİLDİ: Önce companyId ile dene, bulamazsan userId ile dene
    let trx = null;
    
    if (companyId) {
      // 1. CompanyId ile ara (yeni kayıtlar)
      trx = await Transaction.findOne({
        _id: id,
        companyId: companyId,
        direction: { $in: ["alacak", "borc"] },
      }).lean();
      
      console.log("CompanyId ile arama:", trx ? "Bulundu" : "Bulunamadı");
    }
    
    if (!trx) {
      // 2. UserId ile ara (eski kayıtlar veya companyId yoksa)
      trx = await Transaction.findOne({
        _id: id,
        userId: userId,
        direction: { $in: ["alacak", "borc"] },
      }).lean();
      
      console.log("UserId ile arama:", trx ? "Bulundu" : "Bulunamadı");
    }

    if (!trx) {
      return res.status(404).json({ message: "Kayıt bulunamadı" });
    }

    console.log("Transaction bulundu:", trx._id, "Type:", trx.type, "Direction:", trx.direction);

    // ✅ Cari bul - Aynı mantık (önce companyId, sonra userId)
    let cari = null;
    
    if (companyId) {
      cari = await Cari.findOne({
        _id: trx.accountId,
        companyId: companyId,
      }).lean();
    }
    
    if (!cari) {
      cari = await Cari.findOne({
        _id: trx.accountId,
        userId: userId,
      }).lean();
    }

    const cariAd =
      cari?.unvan || cari?.firmaAdi || cari?.ad || cari?.name || cari?.email || "-";

    // ✅ Firma ayarlarını çek
    const { db } = await connectToDatabase();
    const col = db.collection("company_settings");

    // Önce companyId ile dene
    let companyDoc = null;
    if (companyId) {
      companyDoc = await col.findOne({ companyId: companyId });
    }
    // Bulamazsan userId ile dene
    if (!companyDoc) {
      companyDoc = await col.findOne({ userId: userId });
    }

    const company = companyDoc || {
      firmaAdi: "",
      yetkili: "",
      telefon: "",
      eposta: "",
      web: "",
      vergiDairesi: "",
      vergiNo: "",
      adres: "",
      logo: "",
    };

    // ✅ DÜZELTİLDİ: Makbuz başlığı (direction'a göre değil, type'a göre)
    // Tahsilat = alacak, Ödeme = borc
    let title = "MAKBUZ";
    if (trx.type === "tahsilat" || (trx.type !== "odeme" && trx.direction === "alacak")) {
      title = "TAHSİLAT MAKBUZU";
    } else {
      title = "ÖDEME MAKBUZU";
    }

    // ✅ Güncel bakiye hesapla (cari'nin tüm işlemlerinin toplamı)
    let currentBalance = 0;
    try {
      const allTrx = await Transaction.find({
        accountId: trx.accountId,
        isDeleted: { $ne: true },
        status: { $ne: "cancelled" },
      }).lean();

      currentBalance = allTrx.reduce((sum, t) => {
        const amount = Number(t.totalTRY || t.amount || 0);
        return t.direction === "borc" ? sum + amount : sum - amount;
      }, 0);
    } catch (e) {
      console.error("Bakiye hesaplanamadı:", e);
    }

    const html = tahsilatMakbuzuTemplate({
      title,
      date: trx.date ? new Date(trx.date).toLocaleDateString("tr-TR") : "-",
      cari: cariAd,
      amount: fmt(trx.totalTRY || trx.amount),
      currency: trx.currency || "TRY",
      fxRate: trx.fxRate,
      totalFCY: trx.totalFCY,
      method:
        trx.paymentMethod === "cash"
          ? "Nakit"
          : trx.paymentMethod === "eft"
          ? "EFT / Havale"
          : trx.paymentMethod === "kredi_karti" || trx.paymentMethod === "kart"
          ? "Kredi Kartı"
          : trx.paymentMethod === "bank"
          ? "Banka"
          : trx.paymentMethod || "-",
      note: trx.note || "",
      docId: String(trx._id),
      company,
      currentBalance: fmt(currentBalance),
    });

    // ✅ Puppeteer ile PDF oluştur
    const isRender = !!process.env.RENDER;
    let browser;

    if (isRender) {
      const puppeteer = (await import("puppeteer-core")).default;
      const chromium = (await import("@sparticuz/chromium")).default;

      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });
    } else {
      const puppeteer = (await import("puppeteer")).default;
      browser = await puppeteer.launch({ headless: "new" });
    }

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    const safeName =
      title === "TAHSİLAT MAKBUZU"
        ? `tahsilat-makbuzu-${Date.now()}.pdf`
        : `odeme-makbuzu-${Date.now()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${safeName}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    
    return res.status(200).send(Buffer.from(pdfBuffer));
    
  } catch (err) {
    console.error("❌ TAHSILAT PDF HATASI:", err);
    return res.status(500).json({ message: "PDF oluşturulamadı", error: err.message });
  }
}