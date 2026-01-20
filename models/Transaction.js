import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema(
  {
    // 🔐 TENANT (projende tenant = userId)
    userId: { type: String, required: true },

    // 🔐 Opsiyonel companyId (create.js zaten yazıyor)
    companyId: { type: String, default: "" },

    // =========================
    // 🔥 SNAPSHOT CARİ (PDF & RAPOR)
    // =========================
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cari",
      required: true,
    },
    accountName: { type: String, default: "" },

    // =========================
    // 📦 YENİ SATIŞ SÖZLEŞMESİ
    // =========================
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        name: String,
        barcode: String,
        sku: String,
        quantity: Number,
        unitPrice: Number,
        vatRate: Number,
        total: Number,
      },
    ],

    // =========================
    // 🧮 MUHASEBE
    // =========================
    direction: { type: String, enum: ["borc", "alacak"], default: "" },
    amount: { type: Number, default: 0 },
    paymentMethod: { type: String, default: "nakit" },
    note: { type: String, default: "" },

    // =========================
    // 📅 GENEL
    // =========================
    date: { type: Date, default: Date.now },
    saleNo: { type: String, default: "" },
    type: { type: String, default: "" }, // sale | payment | purchase
    currency: { type: String, default: "TRY" },
    fxRate: { type: Number, default: 1 },
    totalTRY: { type: Number, default: 0 },
    totalFCY: { type: Number, default: 0 },


        // =========================
    // ❌ İPTAL / SİLME DURUMU (YENİ)
    // =========================
    isDeleted: { type: Boolean, default: false },
    status: { type: String, default: "active" }, // active | cancelled

    canceledAt: { type: Date },
    canceledBy: { type: String, default: "" }, // userId string tutuyoruz (senin sistemin userId string)
    cancelReason: { type: String, default: "" },

        // =========================
    // ❌ İPTAL / İADE / GERİ AL (YENİ)
    // =========================
    refSaleNo: { type: String, default: "" },

    isDeleted: { type: Boolean, default: false },
    status: { type: String, default: "active" }, // active | cancelled | reversed

    canceledAt: { type: Date },
    canceledBy: { type: String, default: "" },
    cancelReason: { type: String, default: "" },


    // ✅ Referans Belge No (İade/İptal için)
    refSaleNo: { type: String, default: "" },

    // =========================
    // ⬇️ ESKİ ALANLAR (KALDI)
    // =========================
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    quantity: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    varyant: { type: String, default: "" },
  },
  { timestamps: true }
);

// 🔎 Performans & tenant güvenliği
TransactionSchema.index({ userId: 1, type: 1, saleNo: 1 });

export default mongoose.models.Transaction ||
  mongoose.model("Transaction", TransactionSchema);
