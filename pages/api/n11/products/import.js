import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Only POST allowed" });
  }

  try {
    await dbConnect();

    const n11Product = req.body;

    if (!n11Product.productSellerCode) {
      return res.status(400).json({
        success: false,
        message: "Ürün sellerCode bulunamadı!",
      });
    }

    // ✅ Token varsa tenant bilgisi al
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    let decoded = null;
    if (token) {
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (e) {
        decoded = null;
      }
    }

    const userId = decoded?.userId || decoded?.id || "system";
    const companyId = decoded?.companyId || null;

    // ✅ Multi-tenant profesyonel: companyId zorunlu olsun
    // (istersen burayı esnetebiliriz ama en temiz hali bu)
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message:
          "companyId bulunamadı. Bu import işlemi multi-tenant için companyId ile yapılmalı.",
      });
    }

    // ERP'de bu SKU var mı kontrol et (companyId ile)
    const existing = await Product.findOne({
      sku: n11Product.productSellerCode,
      companyId,
    });

    if (existing) {
      // ✔ Güncelleme
      existing.name = n11Product.title;
      existing.priceTl = n11Product.price || existing.priceTl;
      existing.stock = n11Product.stock || existing.stock;
      existing.barcode = n11Product.barcode || existing.barcode;
      existing.images = [n11Product.mainImage].filter(Boolean);

      await existing.save();

      return res.status(200).json({
        success: true,
        updated: true,
        product: existing,
      });
    }

    // ✔ ERP'ye yeni ürün oluştur (companyId + createdBy)
    const created = await Product.create({
      userId, // ✅ system olabilir
      createdBy: userId,
      companyId,

      name: n11Product.title,
      sku: n11Product.productSellerCode,
      barcode: n11Product.barcode,
      priceTl: n11Product.price,
      stock: n11Product.stock,
      images: [n11Product.mainImage].filter(Boolean),

      marketplaceSettings: {
        n11: {
          categoryId: n11Product.categoryId,
          brandId: "",
        },
      },
    });

    return res.status(200).json({
      success: true,
      created: true,
      product: created,
    });
  } catch (err) {
    console.error("N11 IMPORT ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "N11 ürünü ERP'ye aktarılırken hata oluştu",
      error: err.message,
    });
  }
}
