/**
 * Pazarama temin şablonu: PUT güncelle, DELETE sil
 */
import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import {
  pazaramaUpdateProductCommercial,
  pazaramaDeleteProductCommercial,
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

  const id = req.query?.id;
  if (!id) return res.status(400).json({ success: false, error: "id gerekli." });

  if (req.method === "PUT") {
    const { isImported, type, name, title, brand, email, address } = req.body || {};
    try {
      const data = await pazaramaUpdateProductCommercial(creds, id, {
        isImported,
        type,
        name,
        title,
        brand,
        email,
        address,
      });
      return res.status(200).json({ success: data?.success !== false, data: data?.data ?? null });
    } catch (err) {
      console.error("[Pazarama] Temin şablonu güncelleme:", err.message);
      return res.status(502).json({ success: false, error: err.message });
    }
  }

  if (req.method === "DELETE") {
    try {
      const data = await pazaramaDeleteProductCommercial(creds, id);
      return res.status(200).json({ success: data?.success !== false });
    } catch (err) {
      console.error("[Pazarama] Temin şablonu silme:", err.message);
      return res.status(502).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, message: "Sadece PUT veya DELETE" });
}
