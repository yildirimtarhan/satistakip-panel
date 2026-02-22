import mongoose from "mongoose";

const N11BrandSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanySettings",
      required: true,
      index: true,
    },
    id: { type: Number, required: true },
    name: { type: String, required: true },
  },
  { timestamps: true }
);

// ✅ Aynı firmada aynı brandId 1 kere olsun
N11BrandSchema.index({ companyId: 1, id: 1 }, { unique: true });

export default mongoose.models.N11Brand || mongoose.model("N11Brand", N11BrandSchema);
