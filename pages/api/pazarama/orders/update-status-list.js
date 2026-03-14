/**
 * Pazarama toplu sipariş durumu güncelleme
 * PUT order/updateOrderStatusList
 * Siparişteki tüm ürünlere aynı statü atanır (örn. 3→12 Hazırlanıyor)
 */
import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import { pazaramaUpdateOrderStatusList } from "@/lib/marketplaces/pazaramaService";

export default async function handler(req, res) {
  if (req.method !== "PUT") return res.status(405).json({ success: false, message: "Sadece PUT" });

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

  const { orderNumber, status } = req.body || {};
  if (!orderNumber) return res.status(400).json({ success: false, error: "orderNumber zorunlu." });
  if (status == null || status === "") return res.status(400).json({ success: false, error: "status zorunlu." });

  try {
    const data = await pazaramaUpdateOrderStatusList(creds, { orderNumber, status });
    return res.status(200).json({
      success: data?.success !== false,
      data: data?.data ?? null,
    });
  } catch (err) {
    console.error("[Pazarama] Toplu sipariş durumu:", err.message);
    return res.status(502).json({ success: false, error: err.message });
  }
}
