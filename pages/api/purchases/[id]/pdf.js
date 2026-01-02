import dbConnect from "@/lib/dbConnect";
import Transaction from "@/models/Transaction";
import Product from "@/models/Product";
import jwt from "jsonwebtoken";

import { createPdf } from "@/lib/pdf/PdfEngine";
import { renderPurchasePdf } from "@/lib/pdf/templates/purchase";

const ITEMS_MARKER = "__PURCHASE_ITEMS__:";
const CANCEL_MARKER = "__PURCHASE_CANCELLED__:";

function extractItems(note) {
  if (!note) return [];
  const idx = note.indexOf(ITEMS_MARKER);
  if (idx === -1) return [];
  try {
    return JSON.parse(note.slice(idx + ITEMS_MARKER.length));
  } catch {
    return [];
  }
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).end();
    }

    await dbConnect();

    const { id, token } = req.query;
    if (!token) {
      return res.status(401).end("Yetkisiz");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded.id;
    const role = decoded.role || "user";

    const purchase = await Transaction.findOne({
      _id: id,
      userId,
      type: "purchase",
    })
      .populate("accountId")
      .lean();

    if (!purchase) {
      return res.status(404).end("Kayıt bulunamadı");
    }

    const itemsRaw = extractItems(purchase.note);
    const cancelled = purchase.note?.includes(CANCEL_MARKER);

    const ids = itemsRaw.map((i) => i.productId).filter(Boolean);
    const products = await Product.find({ _id: { $in: ids } })
      .select("name")
      .lean();

    const byId = new Map(products.map((p) => [String(p._id), p.name]));

    const items = itemsRaw.map((i) => ({
      ...i,
      name: byId.get(String(i.productId)) || "-",
    }));

    // ✅ MERKEZİ PDF MOTOR – DOĞRU KULLANIM
    const doc = createPdf(res, {
      title: "ALIŞ BELGESİ",
      subtitle: cancelled ? "İPTAL EDİLMİŞ ALIŞ" : "",
      userRole: role,
    });

    renderPurchasePdf(doc, {
      cari: purchase.accountId?.unvan || "-",
      date: new Date(purchase.date).toLocaleDateString("tr-TR"),
      ref: purchase._id,
      items,
      cancelled,
    });

    doc.end();
  } catch (err) {
    console.error("PURCHASE PDF ERROR:", err);
    if (!res.headersSent) {
      res.status(500).end("PDF oluşturulamadı");
    }
  }
}
