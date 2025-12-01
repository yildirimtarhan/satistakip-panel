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
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Sadece POST yöntemi kullanılabilir" });
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

    const body = req.body || {};

    // 🧱 1) Product modeline uygun temel data
    const imagesArray = Array.isArray(body.images)
      ? body.images
      : body.images
      ? [body.images]
      : [];

    const productData = {
      userId:
        decoded.userId || decoded.id || decoded._id || String(decoded._id),
      companyId: decoded.companyId || null,

      name: body.name,
      sku: body.sku || "",
      barcode: body.barcode || "",
      modelCode: body.modelCode || "",
      brand: body.brand || "",
      category: body.category || "",
      description: body.description || "",
      images: imagesArray,

      stock: Number(body.stock || 0),

      priceTl: Number(body.priceTl || 0),
      discountPriceTl: Number(body.discountPriceTl || 0),
      vatRate: Number(body.vatRate || 20),

      usdPrice: Number(body.usdPrice || 0),
      eurPrice: Number(body.eurPrice || 0),
      profitMargin: Number(body.profitMargin || 20),
      riskFactor: Number(body.riskFactor || 1.05),
      fxSource: body.fxSource || "tcmb",
      calculatedPrice: Number(body.calculatedPrice || 0),

      marketplaceSettings: {
        n11: {
          categoryId: body.n11CategoryId || "",
          brandId: body.n11BrandId || "",
          preparingDay: Number(body.n11PreparingDay || 3),
          shipmentTemplate: body.n11ShipmentTemplate || "",
          domestic:
            typeof body.n11Domestic === "boolean" ? body.n11Domestic : true,
          attributes: body.n11Attributes || {},
        },
        trendyol: {
          categoryId: body.trendyolCategoryId || "",
          brandId: body.trendyolBrandId || "",
          cargoCompanyId: body.trendyolCargoCompanyId || "",
          attributes: body.trendyolAttributes || {},
        },
        hepsiburada: {
          categoryId: body.hbCategoryId || "",
          merchantSku: body.hbMerchantSku || "",
          desi: body.hbDesi || "",
          kg: body.hbKg || "",
          attributes: body.hbAttributes || {},
        },
        amazon: {
          category: body.amazonCategory || "",
          bulletPoints: body.amazonBulletPoints || [],
          searchTerms: body.amazonSearchTerms || [],
          hsCode: body.amazonHsCode || "",
          attributes: body.amazonAttributes || {},
        },
        ciceksepeti: {
          categoryId: body.csCategoryId || "",
          attributes: body.csAttributes || {},
        },
        pazarama: {
          categoryId: body.pazaramaCategoryId || "",
          attributes: body.pazaramaAttributes || {},
        },
        idefix: {
          categoryId: body.idefixCategoryId || "",
          attributes: body.idefixAttributes || {},
        },
        pttavm: {
          categoryId: body.pttCategoryId || "",
          attributes: body.pttAttributes || {},
        },
      },

      variants: Array.isArray(body.variants) ? body.variants : [],
    };

    // 🌐 Başlangıç marketplace statüleri
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

    // 2️⃣ ERP'ye kaydet
    const newProduct = await Product.create({
      ...body,
      userId,
      companyId,
      marketplaces: {
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
      },
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

    // ---------------- HEPSIBURADA ----------------
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

    // ---------------- ÇİÇEK SEPETİ ----------------
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

    // 3️⃣ Marketplace sonuçlarını ürüne yaz
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
      message: "Beklenmeyen bir hata oluştu",
      error: err.message,
    });
  }
}
