import mongoose from "mongoose";

const N11OrderSchema = new mongoose.Schema(
  {
    orderNumber: String,
    buyer: {},
    shippingAddress: {},
    items: [],
    totalPrice: Number,
    status: String,
    raw: {}
  },
  { timestamps: true }
);

export default mongoose.models.N11Order || mongoose.model("N11Order", N11OrderSchema);
