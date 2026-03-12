/**
 * HB Merchant SKU <-> ERP Product eşleştirme
 * GET: Şirket eşleştirmelerini listele
 * POST: Yeni eşleştirme ekle/sil { merchantSku, productId } veya productId: null ile sil
 */
import { connectToDatabase } from "@/lib/mongodb";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  let decoded;
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ success: false, message: "Yetkisiz" });
  }

  const companyId = decoded?.companyId || decoded?.userId;
  if (!companyId) {
    return res.status(400).json({ success: false, message: "companyId gerekli" });
  }

  const { db } = await connectToDatabase();
  const col = db.collection("hb_erp_mappings");

  if (req.method === "GET") {
    const list = await col.find({ companyId: String(companyId) }).toArray();
    const map = {};
    list.forEach((m) => {
      map[String(m.merchantSku).trim()] = m.productId;
    });
    return res.json({ success: true, mappings: map, list });
  }

  // POST: tek veya toplu
  const body = req.body || {};
  const items = Array.isArray(body.items) ? body.items : [{ merchantSku: body.merchantSku, productId: body.productId }];

  const results = [];
  for (const it of items) {
    const merchantSku = String(it.merchantSku || "").trim();
    if (!merchantSku) continue;
    const productId = it.productId ? String(it.productId).trim() : null;

    if (productId) {
      await col.updateOne(
        { companyId: String(companyId), merchantSku },
        { $set: { companyId: String(companyId), merchantSku, productId, updatedAt: new Date() } },
        { upsert: true }
      );
      results.push({ merchantSku, productId, action: "saved" });
    } else {
      await col.deleteOne({ companyId: String(companyId), merchantSku });
      results.push({ merchantSku, action: "deleted" });
    }
  }

  return res.json({ success: true, results });
}
