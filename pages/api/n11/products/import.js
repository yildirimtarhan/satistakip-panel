import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Only POST allowed" });
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

    // ERP'de bu SKU var mı kontrol et
    const existing = await Product.findOne({
      sku: n11Product.productSellerCode,
    });

    if (existing) {
      // ✔ Güncelleme
      existing.name = n11Product.title;
      existing.priceTl = n11Product.price || existing.priceTl;
      existing.stock = n11Product.stock || existing.stock;
      existing.barcode = n11Product.barcode || existing.barcode;
      existing.images = [n11Product.mainImage];

      await existing.save();

      return res.status(200).json({
        success: true,
        updated: true,
        product: existing,
      });
    }

    // ✔ ERP'ye yeni ürün oluştur
    const created = await Product.create({
      userId: "system",
      name: n11Product.title,
      sku: n11Product.productSellerCode,
      barcode: n11Product.barcode,
      priceTl: n11Product.price,
      stock: n11Product.stock,
      images: [n11Product.mainImage],
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
