// /pages/api/sales/pdf.js
import dbConnect from "@/lib/dbConnect";
import Transaction from "@/models/Transaction";
import Cari from "@/models/Cari";
import { verifyToken } from "@/utils/auth";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  try {
    // =========================
    // 🔐 AUTH
    // =========================
    const authHeader = req.headers.authorization;
    let token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    // 🍪 cookie fallback
    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }

    const tokenUser = verifyToken(token);
    if (!tokenUser?.userId) {
      return res.status(401).json({ message: "Yetkisiz" });
    }

    const { saleNo } = req.query;
    if (!saleNo) {
      return res.status(400).json({ message: "saleNo zorunlu" });
    }

    await dbConnect();

    // =========================
    // 🔎 SATIŞ
    // =========================
    const sale = await Transaction.findOne({
      type: "sale",
      saleNo,
      isDeleted: { $ne: true },
      ...(tokenUser.role !== "admin"
        ? { companyId: tokenUser.companyId }
        : {}),
    }).lean();

    if (!sale) {
      return res.status(404).json({ message: "Satış bulunamadı" });
    }

    // =========================
    // 👤 CARİ
    // =========================
    let cari = null;
    if (sale.accountId) {
      cari = await Cari.findById(sale.accountId).lean();
    }

    // =========================
    // 📄 PDF
    // =========================
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    // 🔤 Font
   // jsPDF varsayılan font
doc.setFont("helvetica", "bold");
doc.setFontSize(14);
doc.text("SATIŞ FİŞİ", 10, y);

doc.setFont("helvetica", "normal");
doc.setFontSize(10);

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

    doc.text(
      `Cari: ${
        cari?.unvan ||
        cari?.firmaAdi ||
        cari?.ad ||
        cari?.name ||
        "-"
      }`,
      10,
      y
    );

    doc.text(`Para Birimi: ${sale.currency || "TRY"}`, 80, y);
    doc.text(`Kur: ${sale.fxRate || 1}`, 140, y);
    y += 10;

    // =========================
    // 📊 TABLO
    // =========================
    autoTable(doc, {
      startY: y,
      head: [["Ürün", "Adet", "Birim", "KDV %", "Toplam"]],
      body: (sale.items || []).map((it) => {
        const qty = Number(it.quantity || 0);
        const price = Number(it.unitPrice || 0);
        const vat = Number(it.vatRate || 0);
        const lineTotal = qty * price * (1 + vat / 100);

        return [
          it.name || it.productName || "-",
          qty,
          price.toFixed(2),
          vat,
          lineTotal.toFixed(2),
        ];
      }),
      styles: { fontSize: 9 },
      headStyles: { fontStyle: "bold" },

    });

    const fy = doc.lastAutoTable.finalY + 10;
    doc.setFont(undefined, "bold");
    doc.text("GENEL TOPLAM:", 220, fy);
    doc.text(
      `${Number(sale.totalTRY || 0).toLocaleString("tr-TR")} ${
        sale.currency || "TRY"
      }`,
      280,
      fy,
      { align: "right" }
    );

    // =========================
    // 📤 RESPONSE
    // =========================
    const pdf = doc.output("arraybuffer");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=satis-${sale.saleNo}.pdf`
    );
    res.send(Buffer.from(pdf));
  } catch (err) {
    console.error("SALE PDF ERROR:", err);
    res.status(500).json({ message: "PDF üretilemedi" });
  }
}
