import dbConnect from "@/lib/dbConnect";
import Transaction from "@/models/Transaction";
import Product from "@/models/Product";
import jwt from "jsonwebtoken";

import { createPdf } from "@/lib/pdf/PdfEngine";
import { renderSalePdf } from "@/lib/pdf/templates/sale";

export default async function handler(req, res) {
  try {
    await dbConnect();

    const { id, token } = req.query;
    if (!token) return res.status(401).end("Yetkisiz");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded.id;
    const role = decoded.role || "user";

    const sale = await Transaction.findOne({
      _id: id,
      userId,
      type: "sale",
    }).populate("accountId");

    if (!sale) return res.status(404).end("Kayıt yok");

    const items = sale.items || [];

    // ürün adlarını çek
    const ids = items.map((i) => i.productId).filter(Boolean);
    const products = await Product.find({ _id: { $in: ids } })
      .select("name")
      .lean();

    const byId = new Map(products.map((p) => [String(p._id), p.name]));

    const mappedItems = items.map((i) => ({
      ...i,
      name: byId.get(String(i.productId)) || "-",
    }));

    const doc = createPdf(res, {
      title: "SATIŞ BELGESİ",
      userRole: role,
    });

    renderSalePdf(doc, {
      cari: sale.accountId?.unvan || "-",
      date: new Date(sale.date).toLocaleDateString("tr-TR"),
      saleNo: sale.saleNo,
      items: mappedItems,
    });

    doc.end();
  } catch (e) {
    console.error("SALE PDF ERROR", e);
    res.status(500).end("PDF oluşturulamadı");
  }
}
