import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import { pazaramaUpdateRefundStatus } from "@/lib/marketplaces/pazaramaService";

export default async function handler(req, res) {
  if (req.method !== "PUT" && req.method !== "POST") return res.status(405).json({ message: "Sadece PUT veya POST destekleniyor" });

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

  const { refundId, status, RefundRejectType, refundReviewType, RefundReviewType, description, documentObjects, quantity } = req.body || {};
  if (!refundId || (status == null || status === "")) {
    return res.status(400).json({ success: false, error: "refundId ve status gerekli." });
  }
  const statusNum = Number(status);
  if (statusNum !== 2 && statusNum !== 3 && statusNum !== 9) {
    return res.status(400).json({ success: false, error: "status 2 (Onayla), 3 (Reddet) veya 9 (İncelemeye Gönder) olabilir." });
  }
  if (statusNum === 3 && (RefundRejectType == null || RefundRejectType === "")) {
    return res.status(400).json({ success: false, error: "status 3 için RefundRejectType zorunlu (1-12)." });
  }
  if (statusNum === 9 && (refundReviewType == null && RefundReviewType == null)) {
    return res.status(400).json({ success: false, error: "status 9 için refundReviewType zorunlu (1-3)." });
  }
  if ((statusNum === 3 || statusNum === 9) && (!description || !String(description).trim())) {
    return res.status(400).json({ success: false, error: "status 3 ve 9 için description zorunlu." });
  }

  const opts = { description, documentObjects, quantity };
  if (statusNum === 9) opts.refundReviewType = refundReviewType ?? RefundReviewType;

  try {
    const data = await pazaramaUpdateRefundStatus(creds, refundId, statusNum, statusNum === 3 ? RefundRejectType : null, opts);
    const msg = statusNum === 2 ? "İade onaylandı." : statusNum === 3 ? "İade reddedildi." : "İncelemeye gönderildi.";
    return res.status(200).json({
      success: data?.success ?? true,
      data: data?.data,
      message: msg,
    });
  } catch (err) {
    console.error("[Pazarama] İade statü güncelleme hatası:", err.message);
    return res.status(502).json({
      success: false,
      error: "Pazarama API hatası",
      message: err.message,
    });
  }
}
