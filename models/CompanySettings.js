import mongoose from "mongoose";

const CompanySettingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    firmaAdi: { type: String, default: "" },
    eposta: { type: String, default: "" },
    adres: { type: String, default: "" },

    // ✅ N11 Ayarları
    n11: {
      appKey: { type: String, default: "" },
      appSecret: { type: String, default: "" },
      environment: { type: String, enum: ["test", "live"], default: "live" },
    },
  },
  { timestamps: true }
);

export default mongoose.models.CompanySettings ||
  mongoose.model("CompanySettings", CompanySettingsSchema, "company_settings");


