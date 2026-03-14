import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import { pazaramaGetOrders } from "@/lib/marketplaces/pazaramaService";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET destekleniyor" });
  }

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token gerekli" });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Geçersiz token" });
  }

  const creds = await getPazaramaCredentials(req);
  if (!creds?.apiKey || !creds?.apiSecret) {
    return res.status(400).json({
      success: false,
      error: "Pazarama API bilgileri eksik. API Ayarları → Pazarama.",
    });
  }

  const { startDate, endDate, page = "1", size = "50", orderNumber, orderItemStatus } = req.query;
  const hasOrderNum = orderNumber && String(orderNumber).trim();
  const defaultDays = hasOrderNum ? 180 : 30; // Sipariş no ile max 6 ay
  let end = endDate || new Date().toISOString().slice(0, 10);
  let start = startDate || new Date(Date.now() - defaultDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (hasOrderNum && (start.length <= 10 || !start.includes("T"))) {
    start = start.slice(0, 10) + "T00:00";
  }
  if (hasOrderNum && (end.length <= 10 || !end.includes("T"))) {
    end = end.slice(0, 10) + "T23:59";
  }

  try {
    const data = await pazaramaGetOrders(
      creds,
      start,
      end,
      parseInt(page, 10) || 1,
      parseInt(size, 10) || 50,
      hasOrderNum ? String(orderNumber).trim() : null,
      orderItemStatus || null
    );
    const orders = data?.data || data?.orders || [];
    return res.status(200).json({
      success: true,
      data: Array.isArray(orders) ? orders : [],
      pagination: {
        page: parseInt(page, 10) || 1,
        size: parseInt(size, 10) || 50,
        totalCount: orders.length,
      },
    });
  } catch (err) {
    console.error("[Pazarama] Sipariş hatası:", err.message);
    return res.status(502).json({
      success: false,
      error: "Pazarama API hatası",
      message: err.message,
    });
  }
}
