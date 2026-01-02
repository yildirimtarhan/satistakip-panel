import dbConnect from "@/lib/dbConnect";
import jwt from "jsonwebtoken";
import Transaction from "@/models/Transaction";
import Cari from "@/models/Cari";

import { createPdf } from "@/lib/pdf/PdfEngine";
import { renderCariEkstrePdf } from "@/lib/pdf/templates/cari";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).end();
    }

    await dbConnect();

    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).end("Yetkisiz");
    }

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded.id;
    const role = decoded.role || "user";

    const { accountId, start, end } = req.query;
    if (!accountId || !start || !end) {
      return res.status(400).end("Parametre eksik");
    }

    const cari = await Cari.findOne({ _id: accountId, userId }).lean();
    if (!cari) {
      return res.status(404).end("Cari bulunamadı");
    }

    const transactions = await Transaction.find({
      userId,
      accountId,
      date: {
        $gte: new Date(start),
        $lte: new Date(end),
      },
    })
      .sort({ date: 1 })
      .lean();

    let balance = 0;
    let totalDebit = 0;
    let totalCredit = 0;

    const rows = transactions.map((t) => {
      let debit = 0;
      let credit = 0;
      let description = "";

      switch (t.type) {
        case "purchase":
          debit = Number(t.amount || 0);
          description = "Alış";
          break;
        case "sale":
          credit = Number(t.amount || 0);
          description = "Satış";
          break;
        case "payment":
          credit = Number(t.amount || 0);
          description = "Tahsilat";
          break;
        case "purchase_cancel":
          description = "Alış İptali";
          break;
        default:
          description = t.description || t.type || "-";
      }

      balance += debit - credit;
      totalDebit += debit;
      totalCredit += credit;

      return {
        date: new Date(t.date).toLocaleDateString("tr-TR"),
        description,
        debit,
        credit,
        balance,
      };
    });

    // ✅ MERKEZİ PDF MOTOR – DOĞRU
    const doc = createPdf(res, {
      title: "CARİ EKSTRESİ",
      subtitle: `${start} - ${end}`,
      userRole: role,
    });

    renderCariEkstrePdf(doc, {
      cari: cari.unvan || cari.ad || "-",
      start,
      end,
      rows,
      totalDebit,
      totalCredit,
      balance,
    });

    doc.end();
  } catch (err) {
    console.error("CARI EKSTRE PDF ERROR:", err);
    if (!res.headersSent) {
      res.status(500).end("PDF oluşturulamadı");
    }
  }
}
