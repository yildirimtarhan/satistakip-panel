/**
 * Pazarama temin şablonları: GET listesi, POST oluştur
 */
import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import {
  pazaramaGetProductCommercials,
  pazaramaCreateProductCommercial,
} from "@/lib/marketplaces/pazaramaService";

export default async function handler(req, res) {
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

  if (req.method === "GET") {
    try {
      const data = await pazaramaGetProductCommercials(creds);
      return res.status(200).json({
        success: data?.success !== false,
        data: data?.data ?? { productCommercialList: [] },
      });
    } catch (err) {
      console.error("[Pazarama] Temin şablonları:", err.message);
      return res.status(502).json({ success: false, error: err.message });
    }
  }

  if (req.method === "POST") {
    const { isImported, type, name, title, brand, email, address } = req.body || {};
    try {
      const data = await pazaramaCreateProductCommercial(creds, {
        isImported,
        type,
        name,
        title: title ?? name,
        brand,
        email,
        address,
      });
      return res.status(200).json({
        success: data?.success !== false,
        data: data?.data ?? null,
      });
    } catch (err) {
      console.error("[Pazarama] Temin şablonu oluşturma:", err.message);
      return res.status(502).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, message: "Sadece GET veya POST" });
}
