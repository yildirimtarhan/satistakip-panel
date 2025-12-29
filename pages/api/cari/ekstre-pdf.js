import dbConnect from "@/lib/dbConnect";
import Cari from "@/models/Cari";
import Transaction from "@/models/Transaction";
import jwt from "jsonwebtoken";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET desteklenir" });
  }

  try {
    // 🔐 TOKEN
    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({ message: "Yetkisiz" });
    }

    const token = auth.split(" ")[1];
    jwt.verify(token, process.env.JWT_SECRET);

    // 🔌 DB
    await dbConnect();

    const { accountId, start, end } = req.query;
    if (!accountId || !start || !end) {
      return res.status(400).json({ message: "Parametre eksik" });
    }

    // 📄 Cari
    const cari = await Cari.findById(accountId);
    if (!cari) {
      return res.status(404).json({ message: "Cari bulunamadı" });
    }

    // 📄 Hareketler
    const rows = await Transaction.find({
      accountId,
      date: {
        $gte: new Date(start),
        $lte: new Date(end),
      },
    }).sort({ date: 1 });

    // 🧾 PDF
    const doc = new jsPDF("landscape");

    doc.setFontSize(14);
    doc.text("CARİ EKSTRESİ", 14, 15);

    doc.setFontSize(10);
    doc.text(`Cari: ${cari.name}`, 14, 23);
    doc.text(`Tarih: ${start} - ${end}`, 14, 29);

    let bakiye = 0;
    let toplamBorc = 0;
    let toplamAlacak = 0;

    const tableRows = rows.map((r) => {
      let borc = 0;
      let alacak = 0;

      // ✅ BORÇ / ALACAK AYRIMI (EN KRİTİK KISIM)
      if (r.type === "tahsilat") {
        alacak = Number(r.amount || 0);
        bakiye -= alacak;
        toplamAlacak += alacak;
      } else if (r.type === "odeme") {
        borc = Number(r.amount || 0);
        bakiye += borc;
        toplamBorc += borc;
      } else {
        // eski satış / alış kayıtları
        borc = Number(r.borc || 0);
        alacak = Number(r.alacak || 0);
        bakiye += borc - alacak;
        toplamBorc += borc;
        toplamAlacak += alacak;
      }

      return [
        new Date(r.date).toLocaleDateString("tr-TR"),
        r.note || r.description || "-",
        borc ? borc.toLocaleString("tr-TR", { minimumFractionDigits: 2 }) : "0,00",
        alacak
          ? alacak.toLocaleString("tr-TR", { minimumFractionDigits: 2 })
          : "0,00",
        bakiye.toLocaleString("tr-TR", { minimumFractionDigits: 2 }),
      ];
    });

    autoTable(doc, {
      startY: 36,
      head: [["Tarih", "Açıklama", "Borç", "Alacak", "Bakiye"]],
      body: tableRows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [255, 165, 0] },
    });

    // 🔢 TOPLAM
    const y = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(10);
    doc.text(`Toplam Borç: ${toplamBorc.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`, 14, y);
    doc.text(
      `Toplam Alacak: ${toplamAlacak.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`,
      80,
      y
    );
    doc.text(`Bakiye: ${bakiye.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`, 150, y);

    const pdf = doc.output("arraybuffer");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=cari-ekstre.pdf");
    return res.send(Buffer.from(pdf));
  } catch (err) {
    console.error("❌ EKSTRE PDF ERROR:", err);
    return res.status(500).json({ message: "PDF oluşturulamadı" });
  }
}
