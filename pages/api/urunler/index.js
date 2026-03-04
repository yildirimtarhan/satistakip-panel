// 📁 /pages/api/urunler/index.js  ✅ FINAL – MULTI TENANT
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader("Allow", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    await dbConnect();

    // 🔐 TOKEN KONTROL
    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({ message: "Token eksik" });
    }

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    /**
     * decoded içeriği varsayımı:
     * {
     *   userId,
     *   companyId,
     *   role: "admin" | "user"
     * }
     */

    // GET için companyId yoksa userId ile listele (e-fatura vb. ekranlarda ürünler gelsin)
    if (req.method !== "GET" && !decoded.companyId) {
      return res.status(401).json({ message: "Firma bilgisi yok" });
    }

    // =====================================================
    // 📌 GET — ÜRÜN LİSTELE (MULTI TENANT)
    // =====================================================
    if (req.method === "GET") {
      const filter = decoded.companyId
        ? { companyId: decoded.companyId }
        : { userId: String(decoded.userId) };

      // Satış ekranı için opsiyonel stok filtresi
      if (req.query.onlyInStock === "true") {
        filter.stock = { $gt: 0 };
      }

      const list = await Product.find(filter).sort({ createdAt: -1 });

      return res.status(200).json(list);
    }

    // =====================================================
    // 📌 POST — ÜRÜN EKLE
    // =====================================================
    if (req.method === "POST") {
      const b = req.body || {};

      if (!b.name || !b.price) {
        return res
          .status(400)
          .json({ message: "Ürün adı ve satış fiyatı gerekli" });
      }

      const newDoc = await Product.create({
        name: b.name,
        barcode: b.barcode || "",
        sku: b.sku || "",
        brand: b.brand || "",
        category: b.category || "",
        description: b.description || "",
        unit: b.unit || "Adet",

        images: b.images || [],
        variants: b.variants || [],

        purchasePrice: Number(b.purchasePrice || 0),
        price: Number(b.price),
        stock: Number(b.stock || 0),
        stockAlert: Number(b.stockAlert || 0),

        currency: b.currency || "TRY",
        vatRate: Number(b.vatRate || 20),

        companyId: decoded.companyId,
        createdBy: decoded.userId,
      });

      return res.status(201).json({
        message: "Ürün eklendi",
        _id: newDoc._id,
      });
    }

    // =====================================================
    // 📌 PUT — ÜRÜN GÜNCELLE
    // =====================================================
    if (req.method === "PUT") {
      const { id } = req.query;

      await Product.findOneAndUpdate(
        { _id: id, companyId: decoded.companyId },
        req.body,
        { new: true }
      );

      return res.status(200).json({ message: "Ürün güncellendi" });
    }

    // =====================================================
    // 📌 DELETE — ÜRÜN SİL
    // =====================================================
    if (req.method === "DELETE") {
      const { id } = req.query;

      await Product.findOneAndDelete({
        _id: id,
        companyId: decoded.companyId,
      });

      return res.status(200).json({ message: "Ürün silindi" });
    }

    return res.status(405).json({ message: "Method Not Allowed" });
  } catch (err) {
    console.error("🔥 Ürün API Hatası:", err);
    return res
      .status(500)
      .json({ message: "Sunucu hatası", error: err.message });
  }
}
