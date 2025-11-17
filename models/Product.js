import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema({
  name: String,
  buyPrice: Number,
  sellPrice: Number,
  stock: Number,
  currency: String, 
  varyantlar: [
    {
      ad: String,
      stok: Number
    }
  ],
  alisFiyati: Number,
  createdAt: Date,
  updatedAt: Date,
});

export default mongoose.models.Product || mongoose.model("Product", ProductSchema);
