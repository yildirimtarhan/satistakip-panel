import mongoose from "mongoose";

const PurchaseItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 0,
    },

    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    vatRate: { type: Number, default: 20 },

    total: {
      type: Number,
      required: true,
      min: 0,
    },

    note: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const PurchaseSchema = new mongoose.Schema(
  {
    // 🔐 Tenant / firma (şimdilik userId bazlı)
    userId: {
      type: String,
      required: true,
      index: true,
    },

    // 🔐 İleride companyId geçilecekse hazır
    companyId: {
      type: String,
      default: "",
      index: true,
    },

    // 👤 Alışı yapan kullanıcı
    createdBy: {
      type: String,
      default: "",
    },

    // 👥 Cari (Tedarikçi)
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cari",
      required: true,
    },

    // 🧾 Fatura / Sipariş bilgileri
    invoiceNo: {
      type: String,
      default: "",
      index: true,
    },

    orderNo: {
      type: String,
      default: "",
    },

    invoiceDate: {
      type: Date,
      default: Date.now,
    },

    // 📦 Alış kalemleri
    items: {
      type: [PurchaseItemSchema],
      required: true,
      validate: (v) => Array.isArray(v) && v.length > 0,
    },

    // 💰 Toplamlar
    subtotal: {
      type: Number,
      default: 0,
    },

    total: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "TRY",
    },

    fxRate: {
      type: Number,
      default: 1,
    },

    totalTRY: {
      type: Number,
      default: 0,
    },

    // 📝 Not
    note: {
      type: String,
      default: "",
    },

    // 🟢 Durum
    status: {
      type: String,
      enum: ["draft", "completed", "cancelled"],
      default: "completed",
      index: true,
    },
  },
  {
    timestamps: true, // createdAt / updatedAt
  }
);

export default mongoose.models.Purchase ||
  mongoose.model("Purchase", PurchaseSchema);
