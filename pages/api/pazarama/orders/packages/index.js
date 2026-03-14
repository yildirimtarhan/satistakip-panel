/**
 * Pazarama sipariş kargo paketlerini listele
 * GET order/api/shipment-packages
 */
import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import { pazaramaGetShipmentPackages } from "@/lib/marketplaces/pazaramaService";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ success: false, message: "Sadece GET" });

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

  const { orderId } = req.query || {};
  if (!orderId || !String(orderId).trim()) {
    return res.status(400).json({ success: false, error: "orderId zorunlu." });
  }

  try {
    const data = await pazaramaGetShipmentPackages(creds, orderId);
    return res.status(200).json({
      success: data?.success !== false,
      data: data?.data ?? null,
    });
  } catch (err) {
    console.error("[Pazarama] Paket listesi:", err.message);
    return res.status(502).json({ success: false, error: err.message });
  }
}
