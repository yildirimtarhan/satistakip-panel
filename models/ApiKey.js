import mongoose from "mongoose";

const ApiKeySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    key: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      default: "Web Integration",
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.ApiKey ||
  mongoose.model("ApiKey", ApiKeySchema);