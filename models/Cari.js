import mongoose from "mongoose";

const CariSchema = new mongoose.Schema({
  ad: String,
  tur: String,
  telefon: String,
  email: String,
  vergiTipi: String,
  vergiNo: String,
  paraBirimi: String,
  kdvOrani: Number,
  adres: String,
  il: String,
  ilce: String,
  postaKodu: String,
  profileUrl: String,

  // Pazaryeri ID'leri
  trendyolCustomerId: String,
  hbCustomerId: String,
  amazonCustomerId: String,
  n11CustomerId: String,
  pazaramaCustomerId: String,
  pttAvmCustomerId: String,
  idefixCustomerId: String,

  balance: { type: Number, default: 0 },
  totalSales: { type: Number, default: 0 },
  totalPurchases: { type: Number, default: 0 },

  userId: String,
  createdAt: Date,
  updatedAt: Date,
});

export default mongoose.models.Cari || mongoose.model("Cari", CariSchema);
