import mongoose from "mongoose";

const CariSchema = new mongoose.Schema(
  {
    // ✅ Firma (Multi-Tenant)
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanySettings",
      required: false, // 🔥 Migration bitince true yapacağız
      index: true,
    },

    // ✅ Cariyi oluşturan kullanıcı
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },

    // ✅ Ticari Ünvan
    unvan: { type: String, default: "" },

    ad: String,
    tur: String,
    telefon: String,
    email: String,

    vergiTipi: String,
    vergiNo: String,
    vergiDairesi: String,
    adres: String,
    il: String,
    ilce: String,
    postaKodu: String,

    paraBirimi: String,
    kdvOrani: Number,
    profileUrl: String,

    trendyolCustomerId: String,
    hbCustomerId: String,
    amazonCustomerId: String,
    n11CustomerId: String,
    pazaramaCustomerId: String,

    bakiye: { type: Number, default: 0 },
    totalSales: { type: Number, default: 0 },
    totalPurchases: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Cari ||
  mongoose.model("Cari", CariSchema, "cari");

