import mongoose from "mongoose";

const CounterSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, required: true },
    year: { type: Number, required: true },
    seq: { type: Number, default: 0 },
  },
  { timestamps: true }
);

CounterSchema.index({ key: 1, companyId: 1, year: 1 }, { unique: true });

export default mongoose.models.Counter ||
  mongoose.model("Counter", CounterSchema);
