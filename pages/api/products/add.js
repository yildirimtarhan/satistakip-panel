// 📁 /pages/api/products/add.js
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import jwt from "jsonwebtoken";

// Pazaryeri servisleri (dosyaları daha önce oluşturmuştuk)
import { n11CreateProduct } from "@/lib/marketplaces/n11Service";
import { trendyolCreateProduct } from "@/lib/marketplaces/trendyolService";
import { hbCreateProduct } from "@/lib/marketplaces/hbService";
import { amazonCreateProduct } from "@/lib/marketplaces/amazonService";
import { pazaramaCreateProduct } from "@/lib/marketplaces/pazaramaService";
import { ciceksepetiCreateProduct } from "@/lib/marketplaces/ciceksepetiService";
import { idefixCreateProduct } from "@/lib/marketplaces/idefixService";
import { pttAvmCreateProduct } from "@/lib/marketplaces/pttAvmService";

export default async function handler(req, res) {
  // ✅ Sadece POST
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Sadece POST yöntemi kullanılabilir",
    });
  }

  try {
    await dbConnect();

    // 🔐 Token kontrol
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Token bulunamadı" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res
        .status(401)
        .json({ success: false, message: "Token geçersiz" });
    }

    const userId = decoded.id || decoded._id || decoded.userId;
    const companyId = decoded.companyId || null;

    // 🔹 Frontend’den gelen body
    const body = req.body || {};
    console.log("🟦 PRODUCT ADD BODY:", body);

    // ---------------- 1) Product modeline uygun temel data ----------------

    // Görselleri normalize et
    const imagesArray = Array.isArray(body.images)
      ? body.images
      : body.images
      ? [body.images]
      : body.resimUrl
      ? [body.resimUrl]
      : [];

    // name zorunlu alan → body.name veya body.ad’den al, hiç yoksa otomatik isim ver
    let incomingName = body.name || body.ad || "";
    if (!incomingName || !String(incomingName).trim()) {
      incomingName = `Ürün ${new Date().toISOString()}`;
    }

    const productData = {
      // Çoklu kullanıcı / firma
      userId: String(userId),
      companyId: companyId || null,

      // Genel bilgiler
      name: incomingName,
      sku: body.sku || "",
      barcode: body.barcode || body.barkod || "",
      modelCode: body.modelCode || "",
      brand: body.brand || body.marka || "",
      category: body.category || body.kategori || "",
      description: body.description || body.aciklama || "",
      images: imagesArray,

      // Stok & fiyat
      stock: Number(body.stock ?? 0),

      priceTl: Number(body.priceTl ?? 0),
      discountPriceTl: Number(body.discountPriceTl ?? 0),
      vatRate: Number(body.vatRate ?? 20),

      usdPrice: Number(body.usdPrice ?? 0),
      eurPrice: Number(body.eurPrice ?? 0),
      profitMargin: Number(body.profitMargin ?? 20),
      riskFactor: Number(body.riskFactor ?? 1.05),
      fxSource: body.fxSource || "tcmb",
      calculatedPrice: Number(body.calculatedPrice ?? 0),

      // Pazaryeri ayarları — frontend’deki yapı ile birebir
      marketplaceSettings: body.marketplaceSettings || {},

      // Varyantlar
      variants: Array.isArray(body.variants) ? body.variants : [],
    };

    // ---------------- 2) Başlangıç marketplace statüleri ----------------
    const baseMarketplaces = {
      n11: {
        status: "Not Sent",
        productId: null,
        taskId: null,
        message: null,
        updatedAt: null,
      },
      trendyol: {
        status: "Not Sent",
        productId: null,
        message: null,
        updatedAt: null,
      },
      hepsiburada: {
        status: "Not Sent",
        productId: null,
        message: null,
        updatedAt: null,
      },
      amazon: {
        status: "Not Sent",
        productId: null,
        message: null,
        updatedAt: null,
      },
      pazarama: {
        status: "Not Sent",
        productId: null,
        message: null,
        updatedAt: null,
      },
      ciceksepeti: {
        status: "Not Sent",
        productId: null,
        message: null,
        updatedAt: null,
      },
      idefix: {
        status: "Not Sent",
        productId: null,
        message: null,
        updatedAt: null,
      },
      pttavm: {
        status: "Not Sent",
        productId: null,
        message: null,
        updatedAt: null,
      },
    };

    // ---------------- 3) ERP'ye ürünü kaydet ----------------
    const newProduct = await Product.create({
      ...productData,
      marketplaces: baseMarketplaces,
    });

    const sendTo = body.sendTo || {};
    const marketplaceResults = {};

    // ---------------- N11 ----------------
    if (sendTo.n11) {
      try {
        const result = await n11CreateProduct(newProduct);
        marketplaceResults.n11 = {
          status: result.success ? "Pending" : "Error",
          productId: result.productId || null,
          taskId: result.taskId || null,
          message: result.message || null,
          updatedAt: new Date(),
        };
      } catch (err) {
        marketplaceResults.n11 = {
          status: "Error",
          productId: null,
          taskId: null,
          message: err.message,
          updatedAt: new Date(),
        };
      }
    }

    // ---------------- TRENDYOL ----------------
    if (sendTo.trendyol) {
      try {
        const result = await trendyolCreateProduct(newProduct);
        marketplaceResults.trendyol = {
          status: result.success ? "Success" : "Error",
          productId: result.productId || null,
          message: result.message || null,
          updatedAt: new Date(),
        };
      } catch (err) {
        marketplaceResults.trendyol = {
          status: "Error",
          productId: null,
          message: err.message,
          updatedAt: new Date(),
        };
      }
    }

    // ---------------- HEPSİBURADA ----------------
    if (sendTo.hepsiburada) {
      try {
        const result = await hbCreateProduct(newProduct);
        marketplaceResults.hepsiburada = {
          status: result.success ? "Success" : "Error",
          productId: result.productId || null,
          message: result.message || null,
          updatedAt: new Date(),
        };
      } catch (err) {
        marketplaceResults.hepsiburada = {
          status: "Error",
          productId: null,
          message: err.message,
          updatedAt: new Date(),
        };
      }
    }

    // ---------------- AMAZON ----------------
    if (sendTo.amazon) {
      try {
        const result = await amazonCreateProduct(newProduct);
        marketplaceResults.amazon = {
          status: result.success ? "Success" : "Error",
          productId: result.productId || null,
          message: result.message || null,
          updatedAt: new Date(),
        };
      } catch (err) {
        marketplaceResults.amazon = {
          status: "Error",
          productId: null,
          message: err.message,
          updatedAt: new Date(),
        };
      }
    }

    // ---------------- PAZARAMA ----------------
    if (sendTo.pazarama) {
      try {
        const result = await pazaramaCreateProduct(newProduct);
        marketplaceResults.pazarama = {
          status: result.success ? "Success" : "Error",
          productId: result.productId || null,
          message: result.message || null,
          updatedAt: new Date(),
        };
      } catch (err) {
        marketplaceResults.pazarama = {
          status: "Error",
          productId: null,
          message: err.message,
          updatedAt: new Date(),
        };
      }
    }

    // ---------------- ÇİÇEKSEPETİ ----------------
    if (sendTo.ciceksepeti) {
      try {
        const result = await ciceksepetiCreateProduct(newProduct);
        marketplaceResults.ciceksepeti = {
          status: result.success ? "Success" : "Error",
          productId: result.productId || null,
          message: result.message || null,
          updatedAt: new Date(),
        };
      } catch (err) {
        marketplaceResults.ciceksepeti = {
          status: "Error",
          productId: null,
          message: err.message,
          updatedAt: new Date(),
        };
      }
    }

    // ---------------- İDEFİX ----------------
    if (sendTo.idefix) {
      try {
        const result = await idefixCreateProduct(newProduct);
        marketplaceResults.idefix = {
          status: result.success ? "Success" : "Error",
          productId: result.productId || null,
          message: result.message || null,
          updatedAt: new Date(),
        };
      } catch (err) {
        marketplaceResults.idefix = {
          status: "Error",
          productId: null,
          message: err.message,
          updatedAt: new Date(),
        };
      }
    }

    // ---------------- PTT AVM ----------------
    if (sendTo.pttavm) {
      try {
        const result = await pttAvmCreateProduct(newProduct);
        marketplaceResults.pttavm = {
          status: result.success ? "Success" : "Error",
          productId: result.productId || null,
          message: result.message || null,
          updatedAt: new Date(),
        };
      } catch (err) {
        marketplaceResults.pttavm = {
          status: "Error",
          productId: null,
          message: err.message,
          updatedAt: new Date(),
        };
      }
    }

    // ---------------- 4) Marketplace sonuçlarını ürüne yaz ----------------
    let updatedProduct = newProduct;
    if (Object.keys(marketplaceResults).length > 0) {
      const setObj = {};
      for (const [key, val] of Object.entries(marketplaceResults)) {
        setObj[`marketplaces.${key}`] = {
          ...(newProduct.marketplaces?.[key] || {}),
          ...val,
        };
      }

      updatedProduct = await Product.findByIdAndUpdate(
        newProduct._id,
        { $set: setObj },
        { new: true }
      );
    }

    return res.status(200).json({
      success: true,
      message: "Ürün ERP'ye kaydedildi.",
      product: updatedProduct,
      marketplaceResults,
    });
  } catch (err) {
    console.error("ADD PRODUCT ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Beklenmeyen bir hata oluştu",
    });
  }
}
