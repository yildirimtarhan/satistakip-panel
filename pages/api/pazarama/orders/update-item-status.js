/**
 * Pazarama sipariş ürün durumu (OrderItem) güncelleme
 * PUT order/updateOrderStatus
 * status: 3=Sipariş Alındı, 12=Hazırlanıyor, 5=Kargoya Verildi, 11=Teslim Edildi, 13=Tedarik Edilemedi, 14=Teslim Edilemedi
 */
import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import { pazaramaUpdateOrderItemStatus } from "@/lib/marketplaces/pazaramaService";

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

  try {
    const data = await pazaramaUpdateOrderItemStatus(creds, { orderNumber, item });
    return res.status(200).json({
      success: data?.success !== false,
      data: data?.data ?? null,
    });
  } catch (err) {
    console.error("[Pazarama] Sipariş ürün durumu:", err.message);
    return res.status(502).json({ success: false, error: err.message });
  }
}
