import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import { pazaramaGetBrands } from "@/lib/marketplaces/pazaramaService";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ message: "Sadece GET destekleniyor" });

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token gerekli" });

  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Geçersiz token" });
  }

  const creds = await getPazaramaCredentials(req);
  if (!creds?.apiKey || !creds?.apiSecret) {
    return res.status(400).json({ success: false, error: "Pazarama API bilgileri eksik." });
  }

  const { page = "1", size = "100", name = "" } = req.query;
  try {
    const data = await pazaramaGetBrands(
      creds,
      parseInt(page, 10) || 1,
      parseInt(size, 10) || 100,
      name
    );
    return res.status(200).json({ success: true, data: data?.data || data || [] });
  } catch (err) {
    console.error("[Pazarama] Marka hatası:", err.message);
    return res.status(502).json({ success: false, error: err.message });
  }
}
