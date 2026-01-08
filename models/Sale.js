import mongoose from "mongoose";

const SaleSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Cari", required: true },

    saleNo: String,
    date: String,

    currency: String,
    fxRate: Number,
    paymentType: String,
    partialPaymentTRY: Number,
    note: String,

    items: [
      {
        productId: mongoose.Schema.Types.ObjectId,
        quantity: Number,
        unitPrice: Number,
        vatRate: Number,
      },
    ],

    totalTRY: Number,
  },
  { timestamps: true }
);

export default mongoose.models.Sale || mongoose.model("Sale", SaleSchema);
