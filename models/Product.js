import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    ad: { type: String, required: true },
    barkod: { type: String, default: "" },
    sku: { type: String, default: "" },
    marka: { type: String, default: "" },
    kategori: { type: String, default: "" },

    n11CategoryId: { type: String, default: "" },

    aciklama: { type: String, default: "" },

    resimUrl: { type: String, default: "" },        // kapak
    resimUrls: { type: [String], default: [] },     // çoklu resim

    alisFiyati: { type: Number, default: 0 },
    satisFiyati: { type: Number, default: 0 },

    stok: { type: Number, default: 0 },
    stokUyari: { type: Number, default: 0 },

    paraBirimi: { type: String, default: "TRY" },
    kdvOrani: { type: Number, default: 20 },

    varyantlar: [
      {
        ad: String,
        stok: Number,
      },
    ],

    // Pazaryeri eşleşme bilgileri
    n11ProductId: { type: String, default: "" },
    trendyolProductId: { type: String, default: "" },
    hbProductId: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.Product ||
  mongoose.model("Product", ProductSchema);
