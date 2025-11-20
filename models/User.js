import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema(
  {
    // Temel Bilgiler
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },

    // Telefon → opsiyonel ama unique
    phone: { type: String, unique: true, sparse: true }, 
    // sparse = telefon olmayan kullanıcıları da unique hatası olmadan kaydeder

    password: { type: String, required: true },

    ad: { type: String, trim: true },
    soyad: { type: String, trim: true },

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

    // ÇiçekSepeti API
    ciceksepetiApi: {
      apiKey: String,
      apiSecret: String,
    },

    // Pazarama API
    pazaramaApi: {
      merchantId: String,
      apiKey: String,
    },

    // E-Fatura Entegrasyon
    efatura: {
      provider: { type: String },
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
