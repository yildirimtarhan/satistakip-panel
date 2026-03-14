/**
 * Pazarama iptal taleplerini sorgula
 * POST order/api/cancel/items
 */
import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import {
  pazaramaGetCancelItems,
  PAZARAMA_CANCEL_STATUS,
} from "@/lib/marketplaces/pazaramaService";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Sadece POST destekleniyor" });

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

  const {
    pageSize = "10",
    pageNumber = "1",
    refundStatus = null,
    requestStartDate = null,
    requestEndDate = null,
    orderNumber = null,
  } = req.body || {};

  try {
    const data = await pazaramaGetCancelItems(creds, {
      pageSize: parseInt(pageSize, 10) || 10,
      pageNumber: parseInt(pageNumber, 10) || 1,
      refundStatus: refundStatus ?? null,
      requestStartDate: requestStartDate ?? null,
      requestEndDate: requestEndDate ?? null,
      orderNumber: orderNumber ?? null,
    });
    return res.status(200).json({
      success: data?.success !== false,
      data: data?.data ?? null,
      statusMap: PAZARAMA_CANCEL_STATUS,
    });
  } catch (err) {
    console.error("[Pazarama] İptal talepleri:", err.message);
    return res.status(502).json({ success: false, error: err.message });
  }
}
