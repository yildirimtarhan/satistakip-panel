import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema({
  accountId: mongoose.Types.ObjectId,
  productId: mongoose.Types.ObjectId,
  type: String, 
  quantity: Number,
  unitPrice: Number,
  total: Number,
  currency: String,
  fxRate: Number,
  totalTRY: Number,
  varyant: String,
  date: Date,
});

export default mongoose.models.Transaction || mongoose.model("Transaction", TransactionSchema);
