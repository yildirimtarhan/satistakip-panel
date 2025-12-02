import mongoose from "mongoose";

const N11CategorySchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    parentId: { type: Number, default: 0 },
    fullPath: { type: String, default: "" }, // Örn: Elektronik > Laptop > Bilgisayar
    attributes: { type: Array, default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.N11Category ||
  mongoose.model("N11Category", N11CategorySchema);
