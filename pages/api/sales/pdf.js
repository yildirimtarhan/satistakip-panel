import dbConnect from "@/lib/dbConnect";
import Transaction from "@/models/Transaction";
import { verifyToken } from "@/utils/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { createPdf } from "@/lib/pdf/PdfEngine";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).end("Method Not Allowed");
  }

  try {
    await dbConnect();

    // 🔐 TOKEN
    const token = req.headers.authorization?.replace("Bearer ", "");
    const user = verifyToken(token);
    if (!user?.userId) {
      return res.status(401).end("Yetkisiz");
    }

    const { saleNo } = req.query;
    if (!saleNo) {
      return res.status(400).end("saleNo gerekli");
    }

    // 🔎 SATIŞ
    const sale = await Transaction.findOne({
      saleNo,
      type: "sale",
      userId: user.userId,
      isDeleted: { $ne: true },
    }).lean();

    if (!sale) {
      return res.status(404).end("Satış bulunamadı");
    }

    // 🏢 FİRMA
    const { db } = await connectToDatabase();
    const company = await db.collection("company_settings").findOne({ userId: user.userId });

    // =========================
    // 📄 PDF BAŞLANGIÇ
    // =========================
    const doc = createPdf(res, {
      title: "Satış Fişi",
      fileName: sale.saleNo,
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

    doc.fontSize(14).text("SATIŞ FİŞİ", 400, 40, { align: "right" });
    doc.fontSize(9).text(sale.saleNo, 400, 58, { align: "right" });

    y += 18;
    doc.moveTo(40, y).lineTo(550, y).stroke();
    y += 15;

    // =========================
    // 👤 CARİ BİLGİ
    // =========================
    doc.fontSize(10).text(`Cari: ${sale.accountName || "—"}`, 40, y);
    y += 14;

    doc.text(`Tarih: ${new Date(sale.date).toLocaleDateString("tr-TR")}`, 40, y);

    y += 20;

    // =========================
    // ✅ TOPLAM HESAPLARI (KDV AYRIMLI)
    // =========================
    const items = Array.isArray(sale.items) ? sale.items : [];

    let araToplam = 0;
    let kdvToplam = 0;
    let genelToplam = 0;

    const computedItems = items.map((item) => {
      const quantity = Number(item?.quantity || 0);
      const unitPrice = Number(item?.unitPrice || 0);

      // ✅ item içinde yoksa default 20
      const vatRate = Number(item?.vatRate ?? 20);

      const net = quantity * unitPrice;
      const vatAmount = (net * vatRate) / 100;
      const gross = net + vatAmount;

      araToplam += net;
      kdvToplam += vatAmount;
      genelToplam += gross;

      return {
        ...item,
        quantity,
        unitPrice,
        vatRate,
        net,
        vatAmount,
        total: gross,
      };
    });

    // =========================
    // 📦 TABLO BAŞLIK
    // =========================
    doc.rect(40, y, 510, 20).fill("#f2f2f2");
    doc.fillColor("#000").fontSize(9);

    doc.text("Ürün", 45, y + 6);
    doc.text("Adet", 255, y + 6, { width: 40, align: "right" });
    doc.text("Birim", 305, y + 6, { width: 55, align: "right" });
    doc.text("KDV%", 370, y + 6, { width: 45, align: "right" });
    doc.text("KDV₺", 420, y + 6, { width: 55, align: "right" });
    doc.text("Toplam", 475, y + 6, { width: 70, align: "right" });

    y += 25;

    // =========================
    // 📄 ÜRÜNLER
    // =========================
    for (const item of computedItems) {
      doc.fontSize(9).fillColor("#000");

      doc.text(item?.name || "-", 45, y, { width: 190 });

      doc.text(String(item.quantity || 0), 255, y, { width: 40, align: "right" });
      doc.text(item.unitPrice.toFixed(2), 305, y, { width: 55, align: "right" });

      doc.text(String(item.vatRate || 0), 370, y, { width: 45, align: "right" });
      doc.text(item.vatAmount.toFixed(2), 420, y, { width: 55, align: "right" });

      doc.text(item.total.toFixed(2), 475, y, { width: 70, align: "right" });

      y += 16;

      if (y > 740) {
        doc.addPage();
        y = 40;
      }
    }

    // =========================
    // 🧮 TOPLAMLAR (KDV AYRIMLI)
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
    console.error("PDF ERROR:", err);
    return res.status(500).end("PDF oluşturulamadı");
  }
}
