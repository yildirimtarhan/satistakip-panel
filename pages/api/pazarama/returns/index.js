import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import { pazaramaGetRefunds } from "@/lib/marketplaces/pazaramaService";

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

  const { requestStartDate, requestEndDate, page = "1", size = "50", refundStatus, splitItems } = req.query;
  const end = requestEndDate || new Date().toISOString().slice(0, 10);
  const start = requestStartDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  try {
    const split = splitItems === "true" ? true : splitItems === "false" ? false : null;
    const data = await pazaramaGetRefunds(
      creds,
      start,
      end,
      parseInt(page, 10) || 1,
      parseInt(size, 10) || 50,
      refundStatus ? parseInt(refundStatus, 10) : null,
      split
    );

    const pageInfo = data?.data?.responsePage || {};
    return res.status(200).json({
      success: true,
      data: data?.data?.refundList || [],
      pagination: {
        pageIndex: pageInfo.pageIndex || parseInt(page, 10),
        pageSize: pageInfo.pageSize || parseInt(size, 10),
        totalCount: pageInfo.totalCount || 0,
        totalPages: pageInfo.totalPages || 1,
      },
      pageReport: data?.data?.pageReport || {},
    });
  } catch (err) {
    console.error("[Pazarama] İade hatası:", err.message);
    return res.status(502).json({
      success: false,
      error: "Pazarama API hatası",
      message: err.message,
    });
  }
}
