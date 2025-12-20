import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";

export default async function handler(req, res) {
  try {
    // 🔐 TOKEN
   
function getTokenFromCookie(req) {
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/token=([^;]+)/);
  return match ? match[1] : null;
}

const token = getTokenFromCookie(req);

if (!token) {
  return res.status(401).json({ message: "Token yok" });
}

let decoded;
try {
  decoded = jwt.verify(token, process.env.JWT_SECRET);
} catch {
  return res.status(401).json({ message: "Geçersiz token" });
}


    const { accountId, start, end } = req.query;
    if (!accountId || !start || !end) {
      return res.status(400).json({ message: "Eksik parametre" });
    }

    // 🗄️ DB
    const client = await clientPromise;
    const db = client.db();

    const cari = await db.collection("cariler").findOne({ _id: accountId });
    const rows = await db
      .collection("cariTransactions")
      .find({
        accountId,
        tarih: { $gte: new Date(start), $lte: new Date(end) },
      })
      .sort({ tarih: 1 })
      .toArray();

    // 📄 PDF
    const doc = new PDFDocument({
      size: "A4",
      margin: 40,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="cari-ekstre-${cari?.ad || "cari"}.pdf"`
    );

    doc.pipe(res);

    // 🔤 FONT
    const fontPath = path.join(
      process.cwd(),
      "public/fonts/Roboto-Regular.ttf"
    );
    doc.registerFont("Roboto", fontPath);
    doc.font("Roboto");

    // 🧾 BAŞLIK
    doc.fontSize(14).text("Cari Ekstresi", { align: "left" });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Cari: ${cari?.ad || "-"}`);
    doc.text(`Tarih Aralığı: ${start} - ${end}`);
    doc.moveDown(1);

    // 📊 TABLO HEADER
    const startY = doc.y;
    const col = {
      tarih: 40,
      aciklama: 110,
      borc: 300,
      alacak: 380,
      bakiye: 460,
    };

    doc.fontSize(10).fillColor("black");
    doc.text("Tarih", col.tarih, startY);
    doc.text("Açıklama", col.aciklama, startY);
    doc.text("Borç", col.borc, startY, { width: 60, align: "right" });
    doc.text("Alacak", col.alacak, startY, { width: 60, align: "right" });
    doc.text("Bakiye", col.bakiye, startY, { width: 60, align: "right" });

    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    let toplamBorc = 0;
    let toplamAlacak = 0;
    let bakiye = 0;

    // 📄 SATIRLAR
    rows.forEach((r) => {
      toplamBorc += r.borc || 0;
      toplamAlacak += r.alacak || 0;
      bakiye += (r.borc || 0) - (r.alacak || 0);

      doc.text(
        new Date(r.tarih).toLocaleDateString("tr-TR"),
        col.tarih,
        doc.y
      );
      doc.text(r.aciklama || "-", col.aciklama, doc.y);
      doc.text((r.borc || 0).toLocaleString("tr-TR"), col.borc, doc.y, {
        width: 60,
        align: "right",
      });
      doc.text((r.alacak || 0).toLocaleString("tr-TR"), col.alacak, doc.y, {
        width: 60,
        align: "right",
      });
      doc.text(bakiye.toLocaleString("tr-TR"), col.bakiye, doc.y, {
        width: 60,
        align: "right",
      });

      doc.moveDown(0.4);
    });

    // 🔢 TOPLAM
    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    doc.fontSize(10).text("TOPLAM", col.aciklama, doc.y);
    doc.text(toplamBorc.toLocaleString("tr-TR"), col.borc, doc.y, {
      width: 60,
      align: "right",
    });
    doc.text(toplamAlacak.toLocaleString("tr-TR"), col.alacak, doc.y, {
      width: 60,
      align: "right",
    });
    doc.text(bakiye.toLocaleString("tr-TR"), col.bakiye, doc.y, {
      width: 60,
      align: "right",
    });

    doc.end();
  } catch (err) {
    console.error("PDF Hatası:", err);
    res.status(500).json({ message: "PDF oluşturulamadı" });
  }
}
