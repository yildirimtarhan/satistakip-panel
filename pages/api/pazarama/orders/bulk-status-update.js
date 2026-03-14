/**
 * Pazarama birden fazla sipariş item statüsünü tek istekte güncelleme
 * POST order/api/bulk-status-update
 * Teslim edildi (11) için sadece status, diğer alanlar null
 */
import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import { pazaramaBulkUpdateOrderItemStatus } from "@/lib/marketplaces/pazaramaService";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, message: "Sadece POST" });

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

  const { orderNumber, orderItemIds, updateShipmentDto } = req.body || {};
  if (!orderNumber) return res.status(400).json({ success: false, error: "orderNumber zorunlu." });
  if (!Array.isArray(orderItemIds) || orderItemIds.length === 0) {
    return res.status(400).json({ success: false, error: "orderItemIds dizisi zorunlu (en az bir id)." });
  }
  if (!updateShipmentDto || (updateShipmentDto.status == null || updateShipmentDto.status === "")) {
    return res.status(400).json({ success: false, error: "updateShipmentDto.status zorunlu." });
  }

  try {
    const data = await pazaramaBulkUpdateOrderItemStatus(creds, {
      orderNumber,
      orderItemIds,
      updateShipmentDto,
    });
    return res.status(200).json({
      success: data?.success !== false,
      data: data?.data ?? null,
    });
  } catch (err) {
    console.error("[Pazarama] Bulk status update:", err.message);
    return res.status(502).json({ success: false, error: err.message });
  }
}
