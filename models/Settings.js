import mongoose from "mongoose";

const SettingsSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    n11: {
      appKey: String,
      appSecret: String,
      environment: { type: String, default: "production" },
    },

    hepsiburada: Object,
    trendyol: Object,
  },
  { timestamps: true }
);

export default mongoose.models.Settings || mongoose.model("Settings", SettingsSchema);
