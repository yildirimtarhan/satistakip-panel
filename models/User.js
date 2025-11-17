import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  // Kullanıcı Bilgileri
  ad: { type: String },
  soyad: { type: String },
  role: { type: String, default: "user" }, // admin, user, operator, bayi, personel

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

  // Pazarama / ÇiçekSepeti API vb.
  ciceksepetiApi: {
    apiKey: String,
    apiSecret: String,
  },

  pazaramaApi: {
    merchantId: String,
    apiKey: String,
  },

}, { timestamps: true });


// Şifre Doğrulama (Login kullanıyor)
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.models.User || mongoose.model("User", UserSchema);
