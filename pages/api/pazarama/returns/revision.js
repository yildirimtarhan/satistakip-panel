/**
 * Pazarama iade revizyon (ek veri talebi yanıtı)
 * POST order/api/refund/revision
 * Pazarama revizyon talep ettiğinde satıcı description + belgeler ile yanıt verir
 */
import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import { pazaramaRefundRevision } from "@/lib/marketplaces/pazaramaService";

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

  const { refundId, description, documentObjects } = req.body || {};
  if (!refundId || !String(refundId).trim()) {
    return res.status(400).json({ success: false, error: "refundId zorunlu." });
  }
  if (description == null || (typeof description === "string" && !description.trim())) {
    return res.status(400).json({ success: false, error: "description zorunlu." });
  }

  try {
    const data = await pazaramaRefundRevision(creds, {
      refundId,
      description,
      documentObjects: Array.isArray(documentObjects) ? documentObjects : [],
    });
    return res.status(200).json({
      success: data?.success !== false,
      message: data?.userMessage ?? data?.message,
    });
  } catch (err) {
    console.error("[Pazarama] İade revizyon:", err.message);
    return res.status(502).json({ success: false, error: err.message });
  }
}
