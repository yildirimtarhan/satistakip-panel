import mongoose from "mongoose";

const KalemSchema = new mongoose.Schema(
  {
    urunId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    urunAdi: { type: String, required: true }, // backend canonical
    adet: { type: Number, default: 1 },
    birimFiyat: { type: Number, default: 0 },
    kdvOrani: { type: Number, default: 0 },

    satirAraToplam: { type: Number, default: 0 },
    satirKdvTutar: { type: Number, default: 0 },
    satirGenelToplam: { type: Number, default: 0 },
  },
  { _id: false }
);

const TeklifSchema = new mongoose.Schema(
  {
    // multi-tenant
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },

    // teklif
    number: { type: String, index: true }, // T-2026-0001 vs
    paraBirimi: { type: String, default: "TL" },
    not: { type: String, default: "" },

    // cari snapshot (listede göstermek için)
    cariId: { type: mongoose.Schema.Types.ObjectId, ref: "Cari" },
    cariUnvan: { type: String, default: "" },

    // canonical kalemler
    kalemler: { type: [KalemSchema], default: [] },

    // totals (canonical)
    araToplam: { type: Number, default: 0 },
    kdvToplam: { type: Number, default: 0 },
    genelToplam: { type: Number, default: 0 },

    // pdf
    pdfUrl: { type: String, default: "" },
    pdfPublicId: { type: String, default: "" },

    // status (canonical values)
    status: {
      type: String,
      enum: [
        "kaydedildi",
        "pdf_yuklendi",
        "gonderildi",
        "onaylandi",
        "revize_istendi",
        "revize_edildi",
      ],
      default: "kaydedildi",
      index: true,
    },

    revizeNotu: { type: String, default: "" },
  },
  { timestamps: true }
);

// Backward compatibility: eski kodlar lines/cariName/totals bekliyorsa diye virtual üretelim.
TeklifSchema.virtual("cariName").get(function () {
  return this.cariUnvan || "";
});
TeklifSchema.virtual("lines").get(function () {
  return (this.kalemler || []).map((k) => ({
    urunId: k.urunId,
    urunAd: k.urunAdi,
    adet: k.adet,
    fiyat: k.birimFiyat,
    kdv: k.kdvOrani,
  }));
});
TeklifSchema.virtual("totals").get(function () {
  return {
    araToplam: this.araToplam,
    kdvToplam: this.kdvToplam,
    genelToplam: this.genelToplam,
  };
});

TeklifSchema.set("toJSON", { virtuals: true });
TeklifSchema.set("toObject", { virtuals: true });

export default mongoose.models.Teklif || mongoose.model("Teklif", TeklifSchema);
