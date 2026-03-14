/**
 * Pazarama iptal talebi statü güncelleme
 * PUT order/api/cancel
 * Firmalar sadece status 2 (Onay) veya 3 (Red) ile işlem yapabilir
 */
import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import {
  pazaramaUpdateCancelStatus,
  PAZARAMA_CANCEL_STATUS,
} from "@/lib/marketplaces/pazaramaService";

export default async function handler(req, res) {
  if (req.method !== "PUT") return res.status(405).json({ message: "Sadece PUT destekleniyor" });

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

  const { refundId, status } = req.body || {};
  if (!refundId || String(refundId).trim() === "") {
    return res.status(400).json({ success: false, error: "refundId gerekli." });
  }
  const statusNum = Number(status);
  if (statusNum !== 2 && statusNum !== 3) {
    return res.status(400).json({
      success: false,
      error: "Firmalar sadece status 2 (Onay) veya 3 (Red) ile güncelleme yapabilir.",
      statusMap: PAZARAMA_CANCEL_STATUS,
    });
  }

  try {
    const data = await pazaramaUpdateCancelStatus(creds, { refundId, status: statusNum });
    const msg =
      statusNum === 2 ? "İptal talebi onaylandı." : "İptal talebi reddedildi.";
    return res.status(200).json({
      success: data?.success ?? true,
      data: data?.data ?? null,
      message: msg,
    });
  } catch (err) {
    console.error("[Pazarama] İptal statü güncelleme:", err.message);
    return res.status(502).json({ success: false, error: err.message });
  }
}
