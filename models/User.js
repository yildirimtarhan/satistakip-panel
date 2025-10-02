// models/User.js
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  hepsiburadaApi: {
    username: String,
    password: String,
    secretKey: String,
    userAgent: String,
  },
}, { timestamps: true });

export default mongoose.models.User || mongoose.model("User", UserSchema);
