import mongoose from "mongoose";

const N11BrandSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.N11Brand ||
  mongoose.model("N11Brand", N11BrandSchema);
