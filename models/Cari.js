import mongoose from "mongoose";

const CariSchema = new mongoose.Schema({
  ad: { type: String, required: true },
  tur: { type: String, default: "Müşteri" },

  telefon: String,
  email: String,

  vergiTipi: { type: String, default: "TCKN" },
  vergiNo: String,
  vergiDairesi: String, // 🆕 EKLENDİ

  adres: String,
  il: String,
  ilce: String,
  postaKodu: String,

  paraBirimi: { type: String, default: "TRY" },
  kdvOrani: { type: Number, default: 20 },

  profileUrl: String,

  // 🛒 Pazaryeri Müşteri ID'leri (frontend ile %100 uyumlu)
  trendyolCustomerId: String,
  hbCustomerId: String,
  n11CustomerId: String,
  amazonCustomerId: String,
  pttCustomerId: String, // 🆕 frontend ile uyumlu hale getirildi
  idefixCustomerId: String,
  ciceksepetiCustomerId: String, // 🆕 EKLENDİ

  balance: { type: Number, default: 0 },
  totalSales: { type: Number, default: 0 },
  totalPurchases: { type: Number, default: 0 },

  userId: String,

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.Cari || mongoose.model("Cari", CariSchema);
