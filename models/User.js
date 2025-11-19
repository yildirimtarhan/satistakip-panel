import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema(
  {
    // Temel Bilgiler
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true }, // 📱 Telefon ile giriş desteği
    password: { type: String, required: true },

    ad: { type: String },
    soyad: { type: String },

    // Rolleri: admin, user, operator, bayi, personel
    role: { type: String, default: "user" },

    // 🛑 Admin Onayı
    approved: { type: Boolean, default: false },

    // Firma ID — İleride çoklu firma desteği için
    companyId: { type: String },

    // Hepsiburada API
    hepsiburadaApi: {
      username: String,
      password: String,
      secretKey: String,
      userAgent: String,
    },

    // Trendyol API
    trendyolApi: {
      supplierId: String,
      apiKey: String,
      apiSecret: String,
    },

    // N11 API
    n11Api: {
      appKey: String,
      appSecret: String,
    },

    // ÇiçekSepeti
    ciceksepetiApi: {
      apiKey: String,
      apiSecret: String,
    },

    // Pazarama
    pazaramaApi: {
      merchantId: String,
      apiKey: String,
    },

    // E-Fatura Entegrasyon Ayarları (Taxten / Mikro / Paraşüt)
    efatura: {
      provider: { type: String }, // taxten, paraşüt, genel
      apiKey: { type: String },
      apiSecret: { type: String },
      vkn: { type: String },
      firmaUnvan: { type: String },
    },
  },
  { timestamps: true }
);

// 🔐 Şifre kontrol fonksiyonu
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.models.User || mongoose.model("User", UserSchema);
