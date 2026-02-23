import dbConnect from "@/lib/dbConnect";
import ApiKey from "@/models/ApiKey";
import crypto from "crypto";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ message: "Sadece POST" });

  try {
    await dbConnect();

    // 🔐 Admin kontrolü (JWT'den companyId alıyoruz)
    const token =
      req.headers.authorization?.split(" ")[1];

    if (!token)
      return res.status(401).json({ message: "Token gerekli" });

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const companyId = decoded.companyId;

    if (!companyId)
      return res.status(400).json({ message: "Company bulunamadı" });

    // 🔑 Random API Key üret
    const random = crypto.randomBytes(32).toString("hex");
    const apiKey = `sk_live_${random}`;

    const newKey = await ApiKey.create({
      companyId,
      key: apiKey,
      name: req.body.name || "Web Integration",
    });

    return res.status(200).json({
      message: "API Key oluşturuldu",
      apiKey: newKey.key,
    });

  } catch (err) {
    return res.status(400).json({
      message: err.message,
    });
  }
}