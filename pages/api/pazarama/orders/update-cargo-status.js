/**
 * Pazarama kargo takip durumu bildirme
 * PUT order/updateOrderStatus
 * status: 5 = Kargoya Verildi
 */
import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import { pazaramaUpdateOrderCargoStatus } from "@/lib/marketplaces/pazaramaService";

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

  const { orderNumber, item } = req.body || {};
  if (!orderNumber) return res.status(400).json({ success: false, error: "orderNumber zorunlu." });
  if (!item?.orderItemId) return res.status(400).json({ success: false, error: "item.orderItemId zorunlu." });
  if (item.status == null || item.status === "") return res.status(400).json({ success: false, error: "item.status zorunlu." });
  if (!item.shippingTrackingNumber && !item.trackingnumber) {
    return res.status(400).json({ success: false, error: "item.shippingTrackingNumber veya trackingnumber zorunlu." });
  }
  if (!item.cargoCompanyId) return res.status(400).json({ success: false, error: "item.cargoCompanyId zorunlu." });

  try {
    const data = await pazaramaUpdateOrderCargoStatus(creds, { orderNumber, item });
    return res.status(200).json({
      success: data?.success !== false,
      data: data?.data ?? null,
    });
  } catch (err) {
    console.error("[Pazarama] Kargo takip durumu:", err.message);
    return res.status(502).json({ success: false, error: err.message });
  }
}
