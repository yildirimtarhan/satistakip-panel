// 📁 /pages/api/products/add.js
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";

// Pazaryeri servisleri (dosyaları sonra yazacağız)
import { n11CreateProduct } from "@/lib/marketplaces/n11Service";
import { trendyolCreateProduct } from "@/lib/marketplaces/trendyolService";
import { hbCreateProduct } from "@/lib/marketplaces/hbService";
import { amazonCreateProduct } from "@/lib/marketplaces/amazonService";
import { pazaramaCreateProduct } from "@/lib/marketplaces/pazaramaService";
import { ciceksepetiCreateProduct } from "@/lib/marketplaces/ciceksepetiService";
import { idefixCreateProduct } from "@/lib/marketplaces/idefixService";
import { pttAvmCreateProduct } from "@/lib/marketplaces/pttAvmService";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ success: false, message: "Only POST allowed" });

  try {
    await dbConnect();

    const body = req.body;

    // 1️⃣ ÜRÜNÜ ERP'YE KAYDET
    const newProduct = await Product.create({
      ...body,
      marketplaces: {
        n11: { status: "Not Sent" },
        trendyol: { status: "Not Sent" },
        hepsiburada: { status: "Not Sent" },
        amazon: { status: "Not Sent" },
        pazarama: { status: "Not Sent" },
        ciceksepeti: { status: "Not Sent" },
        idefix: { status: "Not Sent" },
        pttavm: { status: "Not Sent" }
      }
    });

    // 2️⃣ PAZARYERLERİNE GÖNDERİM BAŞLAT (ASYNC)
    const sendTo = body.sendTo || {};

    let marketplaceResults = {};

    // --------------------------
    //        N11
    // --------------------------
    if (sendTo.n11) {
      try {
        const result = await n11CreateProduct(newProduct);
        marketplaceResults.n11 = {
          status: result.success ? "Pending" : "Error",
          productId: result.productId || null,
          message: result.message || null
        };
      } catch (err) {
        marketplaceResults.n11 = {
          status: "Error",
          message: err.message
        };
      }
    }

    // --------------------------
    //      TRENDYOL
    // --------------------------
    if (sendTo.trendyol) {
      try {
        const result = await trendyolCreateProduct(newProduct);
        marketplaceResults.trendyol = {
          status: result.success ? "Success" : "Error",
          productId: result.productId || null,
          message: result.message || null
        };
      } catch (err) {
        marketplaceResults.trendyol = {
          status: "Error",
          message: err.message
        };
      }
    }

    // --------------------------
    //   HEPSIBURADA
    // --------------------------
    if (sendTo.hepsiburada) {
      try {
        const result = await hbCreateProduct(newProduct);
        marketplaceResults.hepsiburada = {
          status: result.success ? "Success" : "Error",
          productId: result.productId || null,
          message: result.message || null
        };
      } catch (err) {
        marketplaceResults.hepsiburada = {
          status: "Error",
          message: err.message
        };
      }
    }

    // --------------------------
    //     AMAZON
    // --------------------------
    if (sendTo.amazon) {
      try {
        const result = await amazonCreateProduct(newProduct);
        marketplaceResults.amazon = {
          status: result.success ? "Success" : "Error",
          productId: result.productId || null,
          message: result.message || null
        };
      } catch (err) {
        marketplaceResults.amazon = {
          status: "Error",
          message: err.message
        };
      }
    }

    // --------------------------
    //  PAZARAMA
    // --------------------------
    if (sendTo.pazarama) {
      try {
        const result = await pazaramaCreateProduct(newProduct);
        marketplaceResults.pazarama = {
          status: result.success ? "Success" : "Error",
          productId: result.productId || null,
          message: result.message || null
        };
      } catch (err) {
        marketplaceResults.pazarama = {
          status: "Error",
          message: err.message
        };
      }
    }

    // --------------------------
    //  ÇİÇEK SEPETİ
    // --------------------------
    if (sendTo.ciceksepeti) {
      try {
        const result = await ciceksepetiCreateProduct(newProduct);
        marketplaceResults.ciceksepeti = {
          status: result.success ? "Success" : "Error",
          productId: result.productId || null,
          message: result.message || null
        };
      } catch (err) {
        marketplaceResults.ciceksepeti = {
          status: "Error",
          message: err.message
        };
      }
    }

    // --------------------------
    //      İDEFİX
    // --------------------------
    if (sendTo.idefix) {
      try {
        const result = await idefixCreateProduct(newProduct);
        marketplaceResults.idefix = {
          status: result.success ? "Success" : "Error",
          productId: result.productId || null,
          message: result.message || null
        };
      } catch (err) {
        marketplaceResults.idefix = {
          status: "Error",
          message: err.message
        };
      }
    }

    // --------------------------
    //      PTT AVM
    // --------------------------
    if (sendTo.pttavm) {
      try {
        const result = await pttAvmCreateProduct(newProduct);
        marketplaceResults.pttavm = {
          status: result.success ? "Success" : "Error",
          productId: result.productId || null,
          message: result.message || null
        };
      } catch (err) {
        marketplaceResults.pttavm = {
          status: "Error",
          message: err.message
        };
      }
    }

    // 3️⃣ MARKETPLACE SONUÇLARINI ÜRÜNE YAZ
    const updatedProduct = await Product.findByIdAndUpdate(
      newProduct._id,
      { marketplaces: { ...newProduct.marketplaces, ...marketplaceResults } },
      { new: true }
    );

    // 4️⃣ RESPONSE
    return res.status(200).json({
      success: true,
      message: "Ürün ERP'ye kaydedildi ve pazaryerlerine gönderildi.",
      product: updatedProduct,
      marketplaceResults
    });

  } catch (err) {
    console.error("ADD PRODUCT ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Beklenmeyen bir hata oluştu",
      error: err.message
    });
  }
}
