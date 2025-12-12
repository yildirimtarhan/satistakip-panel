// 📁 /models/Application.js
import mongoose from "mongoose";

const ApplicationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },

    // Başvurulan modüller
    modules: {
      efatura: Boolean,
      earsiv: Boolean,
      eirsaliye: Boolean,
    },

    packageType: String,

    contactName: String,
    contactPhone: String,
    contactEmail: String,

    note: String,

    // 🟧 Admin onay sistemi
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    adminNote: String,
  },
  { timestamps: true }
);

export default mongoose.models.Application ||
  mongoose.model("Application", ApplicationSchema);
