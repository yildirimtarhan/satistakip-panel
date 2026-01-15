
 import mongoose from "mongoose";

const TeklifLineSchema = new mongoose.Schema(
  {
    urunId: { type: String, default: "" },
    urunAd: { type: String, default: "" },
    adet: { type: Number, default: 0 },
    fiyat: { type: Number, default: 0 },
    kdv: { type: Number, default: 0 },
    toplam: { type: Number, default: 0 }, // satır toplam (kdv dahil)
  },
  { _id: false }
);

const TeklifSchema = new mongoose.Schema(
  {
    // ✅ Multi-tenant alanlar
    userId: { type: String, required: true, index: true },
    companyId: { type: String, default: "", index: true }, // varsa
    companyName: { type: String, default: "" },
    companyEmail: { type: String, default: "" },

    // ✅ Teklif bilgileri
    number: { type: String, default: "", index: true },
    status: {
      type: String,
      default: "kaydedildi",
      index: true,
      enum: [
        "kaydedildi",
        "pdf_yuklendi",
        "gonderildi",
        "onaylandi",
        "revize_istendi",
        "revize_edildi",
      ],
    },

    cariId: { type: String, default: "", index: true },
    cariName: { type: String, default: "" },

    not: { type: String, default: "" },
    paraBirimi: { type: String, default: "TL" },

    // ✅ Kalemler
    lines: { type: [TeklifLineSchema], default: [] },

    // ✅ Toplamlar (default veriyoruz, böylece validation patlamaz)
    araToplam: { type: Number, required: true, default: 0 },
    kdvToplam: { type: Number, required: true, default: 0 },
    genelToplam: { type: Number, required: true, default: 0 },

    // ✅ PDF
    pdfUrl: { type: String, default: "" },
    pdfPublicId: { type: String, default: "" },

    // ✅ Zamanlar / revize
    sentAt: { type: Date },
    approvedAt: { type: Date },
    revisionRequestedAt: { type: Date },
    revisionNote: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.Teklif || mongoose.model("Teklif", TeklifSchema);

/*
📘 Teklif kayıt yapısı (örnek)

{
  number: "TKL-2026-00001",
  year: 2026,
  seq: 1,

  cariId: ObjectId,
  cariAd: "YILDIRIM AYLUÇTARHAN",

  lines: [
    {
      urunId,
      urunAd,
      adet,
      fiyat,
      kdv
    }
  ],

  note: "",

  logo: "https://res.cloudinary.com/.../logo.png",

  totals: {
    araToplam,
    kdvToplam,
    genelToplam
  },

  // ✅ PDF
  pdfUrl: "https://res.cloudinary.com/.../teklif.pdf",

  // ✅ Durumlar
  status: "Beklemede" | "Gönderildi" | "Onaylandı" | "Reddedildi",
  sentAt: Date,

  createdAt: Date,
  validUntil: Date
}
*/
