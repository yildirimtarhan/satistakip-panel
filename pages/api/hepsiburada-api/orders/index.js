// pages/api/hepsiburada/orders/index.js
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET istekleri desteklenmektedir." });
  }

  try {
    await dbConnect();

    // 1. Token kontrolü
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: "Yetkilendirme başarısız (token eksik)" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 2. Kullanıcıyı DB'den çek
    const user = await User.findOne({ email: decoded.email });
    if (!user || !user.hepsiburada || !user.hepsiburada.merchantId) {
      return res.status(400).json({ message: "Hepsiburada API bilgileri eksik" });
    }

    // 3. Kullanıcının API bilgilerini al
    const { merchantId, password, secretKey, userAgent, ordersEndpoint } = user.hepsiburada;

    const url = `${ordersEndpoint}/order/merchant-orders?status=New`;

    const headers = {
      Authorization: "Basic " + Buffer.from(`${merchantId}:${secretKey}`).toString("base64"),
      "User-Agent": userAgent,
      "Content-Type": "application/json",
    };

    // 4. Hepsiburada API isteği
    const response = await fetch(url, { method: "GET", headers });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Hepsiburada API Hatası:", errorText);
      return res.status(response.status).json({ message: "Hepsiburada API hatası", error: errorText });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error("Hepsiburada orders handler hatası:", error);
    return res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
}
