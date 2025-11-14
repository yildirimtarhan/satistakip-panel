import mongoose from "mongoose";

const N11ProductSchema = new mongoose.Schema(
  {
    sellerProductCode: String,
    productId: String,
    title: String,
    price: Number,
    stock: Number,
    approvalStatus: String,
    brand: String,
    imageUrls: [String],
    categoryFullPath: String,

    raw: {}, // N11’den gelen tüm veri

  },
  { timestamps: true }
);

export default mongoose.models.N11Product || mongoose.model("N11Product", N11ProductSchema);
