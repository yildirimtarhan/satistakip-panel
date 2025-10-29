// 📄 /pages/api/urunler/update-stock.js
import clientPromise from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

/**
 * Body:
 * - productId: string (zorunlu)
 * - delta: number (zorunlu)   -> satışta negatif, alışta pozitif
 * - reason: "sale" | "purchase" | "manual" | "return" | "reservation" | "release"
 * - reservedDelta?: number    -> opsiyonel; marketplace rezervasyon/iptal için
 */
export default async function handler(req, res) {
  res.setHeader("Allow", "POST,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    if (req.method !== "POST") {
      return res.status(405).json({ message: "Yalnızca POST desteklenir" });
    }

    // 🔐 Auth
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.split(" ")[1] : null;
    if (!token) return res.status(401).json({ message: "Token eksik" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Geçersiz token" });
    }

    const { productId, delta, reason, reservedDelta } = req.body || {};
    if (!productId || typeof delta !== "number") {
      return res.status(400).json({ message: "productId ve delta zorunlu." });
    }

    const client = await clientPromise;
    const db = client.db("satistakip");
    const products = db.collection("products");

    let _id;
    try {
      _id = new ObjectId(productId);
    } catch {
      return res.status(400).json({ message: "Geçersiz productId." });
    }

    // 🎯 Atomik güncelleme seti
    const incObj = { stock: Number(delta) };
    if (typeof reservedDelta === "number") {
      incObj.reserved = Number(reservedDelta);
    }

    // ⛔ Stok negatif olmasın: önce mevcutları alıp kontrol ediyoruz
    const existing = await products.findOne({ _id, userId: decoded.userId });
    if (!existing) return res.status(404).json({ message: "Ürün bulunamadı." });

    const nextStock = Number(existing.stock || 0) + Number(delta);
    const nextReserved =
      Number(existing.reserved || 0) + Number(typeof reservedDelta === "number" ? reservedDelta : 0);

    if (nextStock < 0) {
      return res.status(409).json({ message: "Yetersiz stok (işlem stok < 0 yapıyor)." });
    }
    if (nextReserved < 0) {
      return res.status(409).json({ message: "Rezerve negatif olamaz." });
    }

    const update = await products.updateOne(
      { _id, userId: decoded.userId },
      {
        $inc: incObj,
        $set: {
          updatedAt: new Date(),
          lastStockReason: reason || "manual",
          lastStockAt: new Date(),
        },
      }
    );

    if (update.matchedCount === 0) {
      return res.status(404).json({ message: "Ürün bulunamadı." });
    }

    const after = await products.findOne({ _id, userId: decoded.userId }, { projection: { stock: 1, reserved: 1 } });
    return res.status(200).json({
      message: "✅ Stok güncellendi",
      productId,
      stock: Number(after?.stock || 0),
      reserved: Number(after?.reserved || 0),
    });
  } catch (err) {
    console.error("🔥 update-stock API hatası:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
