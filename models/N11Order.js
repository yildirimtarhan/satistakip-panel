import mongoose from "mongoose";

const N11OrderSchema = new mongoose.Schema(
  {
    // ✅ Multi-tenant zorunlu alan
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    // ✅ Bu siparişi kim çekti / işlemi kim yaptı
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ✅ İstersen ayrıca createdBy ayrı tutabilirsin (opsiyonel)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // ✅ N11 sipariş no
    orderNumber: {
      type: String,
      required: true,
      index: true,
    },

    // ✅ N11 internal orderId (OrderService id)
    orderId: {
      type: Number,
      index: true,
    },

    // ✅ Cari bağlantısı
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cari",
      default: null,
      index: true,
    },
    // ✅ alias: bazı yerlerde cariId kullanılıyor
    cariId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cari",
      default: null,
      index: true,
    },

    // ✅ N11 müşteri referansı (varsa)
    n11CustomerId: { type: String, default: "", index: true },

    // ✅ N11 temel bilgiler
    status: { type: String, default: "" },
    buyerName: { type: String, default: "" },
    buyerEmail: { type: String, default: "" },
    buyerPhone: { type: String, default: "" },
    trackingNumber: { type: String, default: "" },
    cargoCompany: { type: String, default: "" },

    quantity: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },

    currency: { type: String, default: "TRY" },

    // ✅ ERP push kontrolü
    erpPushed: { type: Boolean, default: false },
    erpPushedAt: { type: Date, default: null },
    erpSaleNo: { type: String, default: "" },
    erpTransactionId: { type: mongoose.Schema.Types.ObjectId, default: null },

    // ✅ Ham veri (N11 response)
    raw: { type: Object, default: {} },

    // ✅ Log / not
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

// ✅ Aynı şirkette aynı orderNumber 1 kez kayıt edilsin
N11OrderSchema.index({ companyId: 1, orderNumber: 1 }, { unique: true });

export default mongoose.models.N11Order ||
  mongoose.model("N11Order", N11OrderSchema);
