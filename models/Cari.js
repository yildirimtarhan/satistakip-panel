import mongoose from "mongoose";

const CariSchema = new mongoose.Schema({
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

  // 🛒 Pazaryeri müşteri ID’leri (FRONTEND ile birebir uyuşuyor)
  trendyolCustomerId: String,
  hbCustomerId: String,
  amazonCustomerId: String,
  n11CustomerId: String,
  pttCustomerId: String,
  idefixCustomerId: String,
  ciceksepetiCustomerId: String,

  bakiye: { type: Number, default: 0 },
  totalSales: { type: Number, default: 0 },
  totalPurchases: { type: Number, default: 0 },

  userId: String,
  createdAt: Date,
  updatedAt: Date,
});

export default mongoose.models.Cari || mongoose.model("Cari", CariSchema);
