import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema({
  userId: { type: String, required: true },      // ✅ multi-tenant filtre
  saleNo: { type: String, default: "" },         // ✅ satış fişi/gruplama

  accountId: mongoose.Types.ObjectId,
  productId: mongoose.Types.ObjectId,

  type: String, // "sale" | "purchase" | "n11_sale" vs.
  quantity: Number,
  unitPrice: Number,
  total: Number,
  currency: String,
  fxRate: Number,
  totalTRY: Number,
  varyant: String,
  date: Date,

  note: { type: String, default: "" },           // opsiyonel
});

export default mongoose.models.Transaction || mongoose.model("Transaction", TransactionSchema);
