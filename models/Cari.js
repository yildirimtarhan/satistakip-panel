// 📁 /models/Cari.js
import mongoose from "mongoose";

const CariSchema = new mongoose.Schema({
  ad: { type: String, required: true },
  tur: { type: String, default: "Müşteri" },

  telefon: String,
  email: String,

  vergiTipi: { type: String, default: "TCKN" },
  vergiNo: String,
  vergiDairesi: String,

  adres: String,
  il: String,
  ilce: String,
  postaKodu: String,

  paraBirimi: { type: String, default: "TRY" },

  // 🛒 Pazaryeri müşteri ID'leri – FRONTEND ile birebir uyumlu
  trendyolCustomerId: String,
  hbCustomerId: String,
  n11CustomerId: String,      // ❗ DOĞRU ALAN
  amazonCustomerId: String,
  pttCustomerId: String,
  idefixCustomerId: String,
  ciceksepetiCustomerId: String,

  // Muhasebe alanları
  bakiye: { type: Number, default: 0 },
  totalSales: { type: Number, default: 0 },
  totalPurchases: { type: Number, default: 0 },

  userId: String,
  createdAt: Date,
  updatedAt: Date,
});

export default mongoose.models.Cari || mongoose.model("Cari", CariSchema);
