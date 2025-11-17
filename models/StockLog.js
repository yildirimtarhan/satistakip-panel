import mongoose from "mongoose";

const StockLogSchema = new mongoose.Schema({
  productId: mongoose.Types.ObjectId,
  accountId: mongoose.Types.ObjectId,
  type: String,
  varyant: String,
  quantity: Number,
  unitPrice: Number,
  total: Number,
  currency: String,
  fxRate: Number,
  totalTRY: Number,
  createdAt: Date,
});

export default mongoose.models.StockLog || mongoose.model("StockLog", StockLogSchema);
