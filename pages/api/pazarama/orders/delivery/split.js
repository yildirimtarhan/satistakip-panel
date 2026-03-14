/**
 * Pazarama sipariş paket bölme (farklı depo/adresten gönderim)
 * PUT order/api/delivery/split
 */
import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import { pazaramaDeliverySplit } from "@/lib/marketplaces/pazaramaService";

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

  const { orderId, shipmentCode, sellerAddressId, cargoCompanyId, items } = req.body || {};
  if (!orderId) return res.status(400).json({ success: false, error: "orderId zorunlu." });
  if (!shipmentCode) return res.status(400).json({ success: false, error: "shipmentCode zorunlu." });
  if (!sellerAddressId) return res.status(400).json({ success: false, error: "sellerAddressId zorunlu (getSellerStoreAndRefundAddress → storeAddress.storeAddressInfo.id)." });
  if (!cargoCompanyId) return res.status(400).json({ success: false, error: "cargoCompanyId zorunlu." });
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, error: "items dizisi zorunlu [{ orderItemId, quantity }]." });
  }

  try {
    const data = await pazaramaDeliverySplit(creds, {
      orderId,
      shipmentCode,
      sellerAddressId,
      cargoCompanyId,
      items,
    });
    return res.status(200).json({ success: data?.success !== false, data: data?.data ?? null });
  } catch (err) {
    console.error("[Pazarama] Paket bölme:", err.message);
    return res.status(502).json({ success: false, error: err.message });
  }
}
