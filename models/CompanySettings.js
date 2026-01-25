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
  },
  { timestamps: true }
);

export default mongoose.models.CompanySettings ||
  mongoose.model("CompanySettings", CompanySettingsSchema);
