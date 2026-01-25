// 📁 /models/Product.js
import mongoose from "mongoose";

const VariantSchema = new mongoose.Schema({
  color: { type: String, default: "" },
  size: { type: String, default: "" },
  barcode: { type: String, default: "" },
  sku: { type: String, default: "" },
  stock: { type: Number, default: 0 },
  priceTl: { type: Number, default: 0 },
  images: [{ type: String }],
});

// ----------------------------------------------
//   ANA ÜRÜN MODELİ
// ----------------------------------------------
const ProductSchema = new mongoose.Schema(
  {
    // 🌐 Çoklu kullanıcı / firma desteği
   // 🌐 Çoklu kullanıcı / firma desteği
userId: { type: String, required: true },

companyId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "CompanySettings",
  required: true,
},



    // 🟦 GENEL BİLGİLER
    name: { type: String, required: true },
    sku: { type: String, default: "" },
    barcode: { type: String, default: "" },
    modelCode: { type: String, default: "" },
    brand: { type: String, default: "" },
    category: { type: String, default: "" },
    description: { type: String, default: "" },

    images: [{ type: String }],

    // 🟨 STOK
    stock: { type: Number, default: 0 },

    // 🟥 TL FİYATLANDIRMA
    priceTl: { type: Number, default: 0 },
    discountPriceTl: { type: Number, default: 0 },
    vatRate: { type: Number, default: 20 },

    // 🟧 DÖVİZ BAZLI HESAPLAMA
    usdPrice: { type: Number, default: 0 },
    eurPrice: { type: Number, default: 0 },
    profitMargin: { type: Number, default: 20 },
    riskFactor: { type: Number, default: 1.05 },
    fxSource: { type: String, default: "tcmb" },
    calculatedPrice: { type: Number, default: 0 },

    // 🟩 PAZARYERİ AYARLARI (UI ile birebir uyumlu)
    marketplaceSettings: {
      n11: {
        categoryId: { type: String, default: "" },
        brandId: { type: String, default: "" },
        preparingDay: { type: Number, default: 3 },
        shipmentTemplate: { type: String, default: "" },
        domestic: { type: Boolean, default: true },
        attributes: { type: Array, default: [] },

      },

      trendyol: {
        categoryId: { type: String, default: "" },
        brandId: { type: String, default: "" },
        cargoCompanyId: { type: String, default: "" },
        attributes: { type: Object, default: {} },
      },

      hepsiburada: {
        categoryId: { type: String, default: "" },
        merchantSku: { type: String, default: "" },
        desi: { type: String, default: "" },
        kg: { type: String, default: "" },
        attributes: { type: Object, default: {} },
      },

      amazon: {
        category: { type: String, default: "" },
        bulletPoints: [{ type: String }],
        searchTerms: [{ type: String }],
        hsCode: { type: String, default: "" },
        attributes: { type: Object, default: {} },
      },

      ciceksepeti: {
        categoryId: { type: String, default: "" },
        attributes: { type: Object, default: {} },
      },

      pazarama: {
        categoryId: { type: String, default: "" },
        attributes: { type: Object, default: {} },
      },

      idefix: {
        categoryId: { type: String, default: "" },
        attributes: { type: Object, default: {} },
      },

      pttavm: {
        categoryId: { type: String, default: "" },
        attributes: { type: Object, default: {} },
      },
    },

    // 🟦 GÖNDERİLECEK PAZARYERLERİ (yeni.js & edit.js ile uyumlu)
    sendTo: {
      n11: { type: Boolean, default: false },
      trendyol: { type: Boolean, default: false },
      hepsiburada: { type: Boolean, default: false },
      amazon: { type: Boolean, default: false },
      pazarama: { type: Boolean, default: false },
      ciceksepeti: { type: Boolean, default: false },
      idefix: { type: Boolean, default: false },
      pttavm: { type: Boolean, default: false },
    },

    // 🟦 GÖNDERİM DURUMLARI (status panel ile birebir uyumlu)
    marketplaces: {
      n11: {
        status: { type: String, default: "Not Sent" }, // Pending, Success, Error
        productId: { type: String, default: null },
        taskId: { type: String, default: null },
        message: { type: String, default: null },
        updatedAt: { type: Date, default: null },
      },

      trendyol: {
        status: { type: String, default: "Not Sent" },
        productId: { type: String, default: null },
        message: { type: String, default: null },
        updatedAt: { type: Date, default: null },
      },

      hepsiburada: {
        status: { type: String, default: "Not Sent" },
        productId: { type: String, default: null },
        message: { type: String, default: null },
        updatedAt: { type: Date, default: null },
      },

      amazon: {
        status: { type: String, default: "Not Sent" },
        productId: { type: String, default: null },
        message: { type: String, default: null },
        updatedAt: { type: Date, default: null },
      },

      pazarama: {
        status: { type: String, default: "Not Sent" },
        productId: { type: String, default: null },
        message: { type: String, default: null },
        updatedAt: { type: Date, default: null },
      },

      ciceksepeti: {
        status: { type: String, default: "Not Sent" },
        productId: { type: String, default: null },
        message: { type: String, default: null },
        updatedAt: { type: Date, default: null },
      },

      idefix: {
        status: { type: String, default: "Not Sent" },
        productId: { type: String, default: null },
        message: { type: String, default: null },
        updatedAt: { type: Date, default: null },
      },

      pttavm: {
        status: { type: String, default: "Not Sent" },
        productId: { type: String, default: null },
        message: { type: String, default: null },
        updatedAt: { type: Date, default: null },
      },
    },

    // 🟥 ONAY TAKİP (Cron job için)
    approvalTracking: {
      n11: {
        lastCheck: { type: Date, default: null },
        isCompleted: { type: Boolean, default: false },
      },
      trendyol: {
        lastCheck: { type: Date, default: null },
        isCompleted: { type: Boolean, default: false },
      },
      hepsiburada: {
        lastCheck: { type: Date, default: null },
        isCompleted: { type: Boolean, default: false },
      },
    },

    // 🟪 VARYANTS
    variants: [VariantSchema],
  },
  { timestamps: true }
);

export default mongoose.models.Product ||
  mongoose.model("Product", ProductSchema);
