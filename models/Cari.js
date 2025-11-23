import mongoose from "mongoose";

const CariSchema = new mongoose.Schema({
  ad: String,
  tur: String,
  telefon: String,
  email: String,

  vergiTipi: String,
  vergiNo: String,
  vergiDairesi: String,

  paraBirimi: String,
  kdvOrani: { type: Number, default: 20 },

  adres: String,
  il: String,
  ilce: String,
  postaKodu: String,

  profileUrl: String,

  // Pazaryeri müşteri ID'leri (FRONTEND İLE BİREBİR)
  trendyolCustomerId: String,
  hbCustomerId: String,
  n11CustomerId: String,
  amazonCustomerId: String,
  pttCustomerId: String,
  idefixCustomerId: String,
  ciceksepetiCustomerId: String,

  // Finansal alanlar
  bakiye: { type: Number, default: 0 },
  totalSales: { type: Number, default: 0 },
  totalPurchases: { type: Number, default: 0 },

  // Kullanıcı ID
  userId: String,

  createdAt: Date,
  updatedAt: Date,
});

export default mongoose.models.Cari || mongoose.model("Cari", CariSchema);
