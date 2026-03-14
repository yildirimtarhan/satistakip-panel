import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import { pazaramaGetPaymentAgreement } from "@/lib/marketplaces/pazaramaService";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ message: "Sadece GET destekleniyor" });

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

  const { startDate, endDate } = req.query;
  const end = endDate || new Date().toISOString().slice(0, 10);
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  try {
    const data = await pazaramaGetPaymentAgreement(creds, start, end);
    const txList = data?.data?.transactionList || [];
    const totalAmount = data?.data?.totalAmount ?? 0;
    const totalCommission = data?.data?.totalCommission ?? 0;
    const totalAllowance = data?.data?.totalAllowance ?? 0;

    return res.status(200).json({
      success: true,
      transactions: txList,
      summary: { totalAmount, totalCommission, totalAllowance },
    });
  } catch (err) {
    console.error("[Pazarama] Muhasebe hatası:", err.message);
    return res.status(502).json({
      success: false,
      error: "Pazarama API hatası",
      message: err.message,
    });
  }
}
