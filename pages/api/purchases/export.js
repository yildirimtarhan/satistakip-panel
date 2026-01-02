import dbConnect from "@/lib/dbConnect";
import Transaction from "@/models/Transaction";
import jwt from "jsonwebtoken";
import ExcelJS from "exceljs";

export default async function handler(req, res) {
  try {
    await dbConnect();

    const auth = req.headers.authorization;
    if (!auth) return res.status(401).end("Yetkisiz");

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded.id;

    const list = await Transaction.find({
      userId,
      type: "purchase",
    }).populate("accountId");

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Alışlar");

    ws.columns = [
      { header: "Tarih", key: "date", width: 15 },
      { header: "Cari", key: "cari", width: 30 },
      { header: "Toplam", key: "total", width: 15 },
    ];

    list.forEach((p) => {
      ws.addRow({
        date: new Date(p.date).toLocaleDateString("tr-TR"),
        cari: p.accountId?.unvan || "-",
        total: p.totalTRY || p.amount || 0,
      });
    });

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=alislar.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    await wb.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error("EXCEL ERROR", e);
    res.status(500).end("Excel oluşturulamadı");
  }
}
