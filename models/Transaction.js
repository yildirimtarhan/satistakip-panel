import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema(
  {
    // ✅ Multi-tenant (firma izolasyonu) — projende "userId" tenant gibi kullanılıyor
    userId: { type: String, required: true },

    // ✅ Kim oluşturdu (admin işlem girerse adminId burada dursun)
    createdBy: { type: String, default: "" },

    // ✅ Cari (zorunlu)
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Cari", required: true },

    // ✅ Cari finans işlemleri (TAHSİLAT/ÖDEME)
    direction: { type: String, enum: ["borc", "alacak"], default: "" }, // ödeme=borc, tahsilat=alacak
    amount: { type: Number, default: 0 },
    paymentMethod: { type: String, default: "nakit" }, // nakit|havale|kart
    note: { type: String, default: "" },

    // ✅ Tarih
    date: { type: Date, default: Date.now },

    // -----------------------------
    // ⬇️ ESKİ ALANLAR (bozulmasın diye KALDI)
    saleNo: { type: String, default: "" },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    type: { type: String, default: "" }, // "sale" | "purchase" vs (eski)
    quantity: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    currency: { type: String, default: "TRY" },
    fxRate: { type: Number, default: 1 },
    totalTRY: { type: Number, default: 0 },
    varyant: { type: String, default: "" },
    // -----------------------------
  },
  { timestamps: true } // createdAt/updatedAt otomatik
);

export default mongoose.models.Transaction ||
  mongoose.model("Transaction", TransactionSchema);
