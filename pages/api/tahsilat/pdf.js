import jwt from "jsonwebtoken";
import dbConnect, { connectToDatabase } from "@/lib/mongodb";

import Transaction from "@/models/Transaction";
import Cari from "@/models/Cari";

// ✅ Senin proje yapında doğru yol burası:
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
    const role = decoded.role || "user";

    if (!userId) return res.status(401).json({ message: "Kullanıcı bulunamadı" });
    if (role === "admin") return res.status(403).json({ message: "Admin ERP işlemi yapamaz" });

    const { id } = req.query;
    if (!id) return res.status(400).json({ message: "id gerekli" });

    // ✅ Transaction bul (multi-tenant)
    const trx = await Transaction.findOne({
  _id: id,
  ...(companyId ? { companyId } : { userId }),
  direction: { $in: ["alacak", "borc"] },
}).lean();

if (!trx) return res.status(404).json({ message: "Kayıt bulunamadı" });

console.log("PDF REQUEST ID:", id, "companyId:", companyId, "userId:", userId);

    // ✅ Cari bul
    const cari = await Cari.findOne({
      _id: trx.accountId,
      ...(companyId ? { companyId } : { userId }),
    }).lean();

    const cariAd =
      cari?.unvan || cari?.firmaAdi || cari?.ad || cari?.name || cari?.email || "-";

    // ✅ Firma ayarlarını çek (senin settings endpoint’inle aynı mantık)
    // pages/api/settings/company.js aynı şekilde kullanıyor :contentReference[oaicite:1]{index=1}
    const { db } = await connectToDatabase();
    const col = db.collection("company_settings");

    const companyDoc = await col.findOne({ userId });

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

    const title = trx.direction === "alacak" ? "TAHSİLAT MAKBUZU" : "ÖDEME MAKBUZU";

    const html = tahsilatMakbuzuTemplate({
      title,
      date: trx.date ? new Date(trx.date).toLocaleDateString("tr-TR") : "-",
      cari: cariAd,
      amount: fmt(trx.amount),
      method:
  trx.paymentMethod === "cash"
    ? "Nakit"
    : trx.paymentMethod === "eft"
    ? "EFT / Havale"
    : trx.paymentMethod === "kredi_karti"
    ? "Kredi Kartı"
    : trx.paymentMethod || "-",

      note: trx.note || "",
      docId: String(trx._id),
      company,
    });

    // ✅ Ortama göre puppeteer seç
    const isRender = !!process.env.RENDER;

    let browser;

    if (isRender) {
      // ✅ Render/Linux: puppeteer-core + chromium
      const puppeteer = (await import("puppeteer-core")).default;
      const chromium = (await import("@sparticuz/chromium")).default;

      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });
    } else {
      // ✅ Local/Windows: puppeteer
      const puppeteer = (await import("puppeteer")).default;

      browser = await puppeteer.launch({
        headless: "new",
      });
    }

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    // ✅ Dosya adı ASCII güvenli
    const safeName =
      trx.direction === "alacak"
        ? `tahsilat-makbuzu-${Date.now()}.pdf`
        : `odeme-makbuzu-${Date.now()}.pdf`;

    // ✅ Header
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${safeName}"`);

    // ✅ EN ÖNEMLİ FIX: Binary düzgün dönsün (sayı sayı gözükme hatası biter)
    res.setHeader("Content-Length", pdfBuffer.length);
    return res.status(200).send(Buffer.from(pdfBuffer));
  } catch (err) {
    console.error("❌ TAHSILAT PDF HATASI:", err);
    return res.status(500).json({ message: "PDF oluşturulamadı", error: err.message });
  }
}
