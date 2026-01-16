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

    // ✅ items normalize + KDV fallback
    items = items.map((i) => {
      const p = prodMap.get(String(i.productId));
      const quantity = Number(i.quantity || 0);
      const unitPrice = Number(i.unitPrice || 0);

      const vatRate = Number(i.vatRate ?? p?.vatRate ?? 20);

      const net = quantity * unitPrice;
      const vatAmount = (net * vatRate) / 100;
      const gross = net + vatAmount;

      return {
        name: i.productName || p?.name || "-",
        barcode: i.barcode || p?.barcode || "-",
        quantity,
        unitPrice,
        vatRate,
        net,
        vatAmount,
        total: gross, // ✅ KDV dahil satır toplam
      };
    });

    // ✅ toplamlar
    const araToplam = items.reduce((s, x) => s + Number(x.net || 0), 0);
    const kdvToplam = items.reduce((s, x) => s + Number(x.vatAmount || 0), 0);
    const genelToplam = araToplam + kdvToplam;

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
      `Vergi Dairesi: ${company?.vergiDairesi || "-"}   Vergi No: ${company?.vergiNo || "-"}`,
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
      purchase?.accountName ||
      purchase?.accountId?.firmaAdi ||
      "—";

    doc.fontSize(10).text(`Cari: ${cariName}`, 40, y);
    y += 14;

    doc.text(`Tarih: ${new Date(purchase.date || new Date()).toLocaleDateString("tr-TR")}`, 40, y);
    y += 20;

    // =========================
    // 📦 TABLO BAŞLIK
    // =========================
    doc.rect(40, y, 510, 20).fill("#f2f2f2");
    doc.fillColor("#000").fontSize(9);

    doc.text("Ürün", 45, y + 6);
    doc.text("Adet", 275, y + 6, { width: 45, align: "right" });
    doc.text("Birim", 325, y + 6, { width: 55, align: "right" });
    doc.text("KDV%", 385, y + 6, { width: 45, align: "right" });
    doc.text("KDV₺", 430, y + 6, { width: 55, align: "right" });
    doc.text("Toplam", 485, y + 6, { width: 65, align: "right" });

    y += 25;

    // =========================
    // 📄 SATIRLAR
    // =========================
    for (const it of items) {
      doc.fontSize(9).fillColor("#000");

      doc.text(it.name || "-", 45, y, { width: 220 });

      doc.text(String(it.quantity || 0), 275, y, { width: 45, align: "right" });
      doc.text(Number(it.unitPrice || 0).toFixed(2), 325, y, { width: 55, align: "right" });

      doc.text(String(it.vatRate || 0), 385, y, { width: 45, align: "right" });
      doc.text(Number(it.vatAmount || 0).toFixed(2), 430, y, { width: 55, align: "right" });

      doc.text(Number(it.total || 0).toFixed(2), 485, y, { width: 65, align: "right" });

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

    doc.fontSize(10).text(`Ara Toplam: ${araToplam.toFixed(2)} TL`, 350, y, { align: "right" });
    y += 14;
    doc.fontSize(10).text(`KDV Toplam: ${kdvToplam.toFixed(2)} TL`, 350, y, { align: "right" });
    y += 16;

    doc.fontSize(12).text(`GENEL TOPLAM: ${genelToplam.toFixed(2)} TL`, 350, y, {
      align: "right",
    });

    // =========================
    // 🔻 FOOTER
    // =========================
    doc.fontSize(8).fillColor("#666").text(
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
