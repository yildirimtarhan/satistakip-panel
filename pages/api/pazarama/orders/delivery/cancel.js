/**
 * Pazarama paketten vazgeç (bölünmüş paketleri birleştir)
 * PUT order/api/delivery/cancel
 */
import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import { pazaramaDeliveryCancel } from "@/lib/marketplaces/pazaramaService";

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

  const { orderId, shipmentCode } = req.body || {};
  if (!orderId) return res.status(400).json({ success: false, error: "orderId zorunlu." });
  if (!shipmentCode) return res.status(400).json({ success: false, error: "shipmentCode zorunlu." });

  try {
    const data = await pazaramaDeliveryCancel(creds, { orderId, shipmentCode });
    return res.status(200).json({ success: data?.success !== false, data: data?.data ?? null });
  } catch (err) {
    console.error("[Pazarama] Paketten vazgeç:", err.message);
    return res.status(502).json({ success: false, error: err.message });
  }
}
