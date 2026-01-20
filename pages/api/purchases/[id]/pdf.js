// /pages/api/purchases/[id]/pdf.js
import dbConnect from "@/lib/dbConnect";
import jwt from "jsonwebtoken";
import Transaction from "@/models/Transaction";
import Product from "@/models/Product";

import { createPdf } from "@/lib/pdf/PdfEngine";
import { connectToDatabase } from "@/lib/mongodb"; // company header için

const ITEMS_MARKER = "__PURCHASE_ITEMS__:";

function extractItemsFromNote(note) {
  if (!note || typeof note !== "string") return [];
  const idx = note.indexOf(ITEMS_MARKER);
  if (idx === -1) return [];
  const json = note.slice(idx + ITEMS_MARKER.length).trim();
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end("Method not allowed");

  try {
    await dbConnect();

    // ✅ token query’den veya header’dan gelebilir
    const token = req.query?.token || req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).end("Token yok");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded?.userId || decoded?.id || decoded?._id;
    if (!userId) return res.status(401).end("Yetki yok");

    const { id } = req.query;
    if (!id) return res.status(400).end("id gerekli");

    // ✅ alış transaction
    const purchase = await Transaction.findOne({
      _id: id,
      userId,
      type: "purchase",
      isDeleted: { $ne: true },
    })
      .populate("accountId")
      .lean();

    if (!purchase) return res.status(404).end("Alış bulunamadı");

    // ✅ firma header
    const { db } = await connectToDatabase();
    const company = await db.collection("company_settings").findOne({ userId });

    // ✅ note içinden items
    let items = extractItemsFromNote(purchase.note);

    // ✅ ürünleri çek (isim + barkod + vatRate)
    const ids = items.map((i) => i.productId).filter(Boolean);
    let prodMap = new Map();

    if (ids.length) {
      const prods = await Product.find({ _id: { $in: ids } })
        .select("name barcode vatRate")
        .lean();
      prodMap = new Map(prods.map((p) => [String(p._id), p]));
    }

    // ✅ items normalize + KDV fallback + Döviz Kolonları
    items = items.map((i) => {
      const p = prodMap.get(String(i.productId));
      const quantity = Number(i.quantity || 0);

      // Orijinal birim fiyat (döviz/TRY)
      const unitPrice = Number(i.unitPrice || 0);

      // ✅ Döviz alanları (fallback'li)
      const currency = i.currency || "TRY";
      const fxRate =
        currency === "TRY" ? 1 : Number(i.fxRate || i.fx || 1);

      const vatRate = Number(i.vatRate ?? p?.vatRate ?? 20);

      // ✅ TL hesap (PDF tutarlı olsun)
      // Satır TRY birim fiyatı:
      const unitPriceTRY =
        currency === "TRY" ? unitPrice : unitPrice * (fxRate || 1);

      const netTRY = quantity * unitPriceTRY;
      const vatAmountTRY = (netTRY * vatRate) / 100;
      const grossTRY = netTRY + vatAmountTRY;

      return {
        name: i.productName || p?.name || "-",
        barcode: i.barcode || p?.barcode || "-",

        quantity,

        unitPrice, // ✅ Orijinal birim fiyat (döviz olabilir)
        currency, // ✅ Para Birimi
        fxRate, // ✅ Kur

        vatRate,

        net: netTRY, // ✅ TL net
        vatAmount: vatAmountTRY, // ✅ TL KDV
        total: grossTRY, // ✅ TL toplam (KDV dahil)
      };
    });

    // ✅ toplamlar (TL)
    const araToplam = items.reduce((s, x) => s + Number(x.net || 0), 0);
    const kdvToplam = items.reduce((s, x) => s + Number(x.vatAmount || 0), 0);
    const genelToplam = araToplam + kdvToplam;

    // ✅ Döviz genel toplamları (USD/EUR) - KDV hariç (istersen dahil de yaparız)
const fxTotals = items.reduce((acc, it) => {
  const cur = it.currency || "TRY";
  if (cur === "TRY") return acc;

  // Döviz toplam = adet * birim fiyat (orijinal)
  const totalFCY = Number(it.quantity || 0) * Number(it.unitPrice || 0);

  acc[cur] = (acc[cur] || 0) + totalFCY;
  return acc;
}, {});

    // =========================
    // 📄 PDF BAŞLANGIÇ
    // =========================
    const doc = createPdf(res, {
      title: "Alış Fişi",
      fileName: `ALIS-${purchase._id}`,
    });

    let y = 40;

    // =========================
    // 🏢 HEADER
    // =========================
    doc.fontSize(14).text(company?.firmaAdi || "Firma", 40, y);
    y += 16;

    doc.fontSize(9).text(
      `Vergi Dairesi: ${company?.vergiDairesi || "-"}   Vergi No: ${
        company?.vergiNo || "-"
      }`,
      40,
      y
    );

    doc.fontSize(14).text("ALIŞ FİŞİ", 400, 40, { align: "right" });
    doc.fontSize(9).text(String(purchase._id), 400, 58, { align: "right" });

    y += 18;
    doc.moveTo(40, y).lineTo(550, y).stroke();
    y += 15;

    // =========================
    // 👤 CARİ
    // =========================
    const cariName =
      purchase?.accountId?.unvan ||
      purchase?.accountId?.firmaAdi ||
      purchase?.accountId?.ad ||
      purchase?.accountId?.name ||
      purchase?.accountId?.title ||
      purchase?.accountId?.adSoyad ||
      purchase?.accountName ||
      "—";

    doc.fontSize(10).text(`Tedarikçi: ${cariName}`, 40, y);
    y += 14;

    doc.text(
      `Tarih: ${new Date(purchase.date || new Date()).toLocaleDateString(
        "tr-TR"
      )}`,
      40,
      y
    );
    y += 20;

    // =========================
    // 📦 TABLO BAŞLIK
    // =========================
    doc.rect(40, y, 510, 20).fill("#f2f2f2");
    doc.fillColor("#000").fontSize(9);

    doc.text("Ürün", 45, y + 6, { width: 195 });
    doc.text("Adet", 240, y + 6, { width: 40, align: "right" });
    doc.text("Birim", 280, y + 6, { width: 55, align: "right" });

    // ✅ Yeni sütunlar
    doc.text("Para", 335, y + 6, { width: 35, align: "right" });
    doc.text("Kur", 370, y + 6, { width: 45, align: "right" });

    doc.text("KDV%", 415, y + 6, { width: 35, align: "right" });
    doc.text("KDV₺", 450, y + 6, { width: 45, align: "right" });

    doc.text("Toplam ₺", 495, y + 6, { width: 55, align: "right" });

    y += 25;

    // =========================
    // 📄 SATIRLAR
    // =========================
    for (const it of items) {
      doc.fontSize(9).fillColor("#000");

      doc.text(it.name || "-", 45, y, { width: 195 });

      doc.text(String(it.quantity || 0), 240, y, { width: 40, align: "right" });
      doc.text(Number(it.unitPrice || 0).toFixed(2), 280, y, {
        width: 55,
        align: "right",
      });

      // ✅ Para / Kur
      doc.text(String(it.currency || "TRY"), 335, y, {
        width: 35,
        align: "right",
      });

      doc.text(Number(it.fxRate || 1).toFixed(4), 370, y, {
        width: 45,
        align: "right",
      });

      doc.text(String(it.vatRate || 0), 415, y, {
        width: 35,
        align: "right",
      });

      doc.text(Number(it.vatAmount || 0).toFixed(2), 450, y, {
        width: 45,
        align: "right",
      });

      // ✅ TL toplam
      doc.text(Number(it.total || 0).toFixed(2), 495, y, {
        width: 55,
        align: "right",
      });

      y += 16;

      if (y > 740) {
        doc.addPage();
        y = 40;
      }
    }

    // =========================
    // 🧮 TOPLAMLAR
    // =========================
    y += 10;
    doc.moveTo(350, y).lineTo(550, y).stroke();
    y += 10;

    doc.fontSize(10).text(`Ara Toplam: ${araToplam.toFixed(2)} TL`, 350, y, {
      align: "right",
    });
    y += 14;

    doc.fontSize(10).text(`KDV Toplam: ${kdvToplam.toFixed(2)} TL`, 350, y, {
      align: "right",
    });
    y += 16;

    doc.fontSize(12).text(`GENEL TOPLAM: ${genelToplam.toFixed(2)} TL`, 350, y, {
      align: "right",
    });

    // ✅ Döviz Genel Toplamları
const fxLines = Object.entries(fxTotals);

if (fxLines.length > 0) {
  y += 18;
  doc.fontSize(10).fillColor("#000");

  for (const [cur, amount] of fxLines) {
    doc.text(
      `Döviz Genel Toplam (${cur}): ${Number(amount || 0).toFixed(2)} ${cur}`,
      350,
      y,
      { align: "right" }
    );
    y += 14;
  }
}

    // =========================
    // 🔻 FOOTER
    // =========================
    doc
      .fontSize(8)
      .fillColor("#666")
      .text(
        "Bu belge SatışTakip ERP tarafından oluşturulmuştur.",
        40,
        doc.page.height - 40,
        { align: "center", width: 510 }
      );

    doc.end();
  } catch (err) {
    console.error("PURCHASE PDF ERROR:", err);
    return res.status(500).end("PDF oluşturulamadı");
  }
}
