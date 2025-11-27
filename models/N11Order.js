// models/N11Order.js
import mongoose from "mongoose";

const N11OrderSchema = new mongoose.Schema(
  {
    orderNumber: String,

    buyer: {
      fullName: String,
      email: String,
      gsm: String,
      taxId: String,
      taxOffice: String,
    },

    shippingAddress: {
      city: String,
      district: String,
      neighborhood: String,
      address: String,
    },

    items: Array,

    orderStatus: String,
    itemStatus: String,

    totalPrice: Number,

    accountId: { type: mongoose.Types.ObjectId, ref: "Cari" },

    userId: String,

    raw: {},
  },
  { timestamps: true }
);

export default mongoose.models.N11Order ||
  mongoose.model("N11Order", N11OrderSchema);
