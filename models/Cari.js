import mongoose from "mongoose";

const CariSchema = new mongoose.Schema(
  {
    // ✅ TİCARİ ÜNVAN (ARTIK STANDART)
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

    bakiye: { type: Number, default: 0 },
    totalSales: { type: Number, default: 0 },
    totalPurchases: { type: Number, default: 0 },

    userId: String,
  },
  { timestamps: true }
);

export default mongoose.models.Cari || mongoose.model("Cari", CariSchema);
