import clientPromise from "@/lib/mongodb";
import { verifyToken } from "@/utils/auth";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { saleNo } = req.query;
    if (!saleNo) {
      return res.status(400).json({ message: "saleNo zorunlu" });
    }

    const db = (await clientPromise).db();

    // 🔹 Satış satırlarını al
    const match =
      decoded.role === "admin"
        ? { type: "sale", saleNo, isDeleted: { $ne: true } }
        : {
            type: "sale",
            saleNo,
            userId: decoded.userId,
            isDeleted: { $ne: true },
          };

    const rows = await db
      .collection("transactions")
      .find(match)
      .toArray();

    if (!rows.length) {
      return res.status(404).json({ message: "Satış bulunamadı" });
    }

    const sale = rows[0];

    // 🔹 Cari
    const account = await db
      .collection("accounts")
      .findOne({ _id: sale.accountId });

    // ================= PDF =================
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    // 🔤 Roboto font yükle
    const fontPath = path.join(process.cwd(), "public/fonts");

    const regular = fs.readFileSync(
      path.join(fontPath, "Roboto-Regular.ttf")
    );
    const bold = fs.readFileSync(
      path.join(fontPath, "Roboto-Bold.ttf")
    );

    doc.addFileToVFS(
      "Roboto-Regular.ttf",
      regular.toString("base64")
    );
    doc.addFileToVFS(
      "Roboto-Bold.ttf",
      bold.toString("base64")
    );

    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
    doc.setFont("Roboto", "normal");

    let y = 12;

    doc.setFont("Roboto", "bold");
    doc.setFontSize(14);
    doc.text("SATIŞ FİŞİ", 10, y);

    doc.setFont("Roboto", "normal");
    doc.setFontSize(10);
    y += 8;

    doc.text(`Satış No: ${sale.saleNo}`, 10, y);
    doc.text(
      `Tarih: ${new Date(sale.date).toLocaleDateString("tr-TR")}`,
      80,
      y
    );
    y += 6;

    doc.text(`Cari: ${account?.ad || "-"}`, 10, y);
    doc.text(`Para Birimi: ${sale.currency}`, 80, y);
    doc.text(`Kur: ${sale.fxRate}`, 140, y);
    y += 10;

    // 🔹 TABLO
    autoTable(doc, {
      startY: y,
      head: [["Ürün", "Adet", "Birim", "KDV %", "KDV", "Toplam"]],
      body: rows.map((r) => [
        r.productName,
        r.qty,
        r.unitPrice.toFixed(2),
        `${r.vatRate}%`,
        (r.vatAmount || 0).toFixed(2),
        r.total.toFixed(2),
      ]),
      styles: {
        font: "Roboto",
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        font: "Roboto",
        fontStyle: "bold",
        fillColor: [33, 150, 243],
        textColor: 255,
      },
      columnStyles: {
        0: { cellWidth: 110 },
        1: { cellWidth: 20, halign: "right" },
        2: { cellWidth: 25, halign: "right" },
        3: { cellWidth: 20, halign: "right" },
        4: { cellWidth: 25, halign: "right" },
        5: { cellWidth: 30, halign: "right" },
      },
    });

    const fy = doc.lastAutoTable.finalY + 10;

    doc.setFont("Roboto", "bold");
    doc.text(`GENEL TOPLAM:`, 220, fy);
    doc.text(
      `${sale.totalTRY.toLocaleString("tr-TR")} TRY`,
      260,
      fy,
      { align: "right" }
    );

    const pdf = doc.output("arraybuffer");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=satis-${sale.saleNo}.pdf`
    );

    return res.send(Buffer.from(pdf));
  } catch (err) {
    console.error("PDF error:", err);
    return res.status(500).json({ message: "PDF üretilemedi" });
  }
}
