// POST /api/efatura/sync-mukellef-cache – GİB mükellef listesini Taxten üzerinden senkronize et
import jwt from "jsonwebtoken";
import { syncMukellefCache } from "@/lib/efatura/mukellefSync";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST desteklenir" });
  }

  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Token gerekli" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyId = decoded?.companyId ? String(decoded.companyId) : null;

    const { daysBack, startDate, endDate } = req.body || {};

    const result = await syncMukellefCache({
      companyId,
      userId: decoded?.userId || decoded?.id,
      daysBack: daysBack != null ? parseInt(daysBack, 10) : 90,
      startDate,
      endDate,
    });

    return res.status(200).json({
      success: true,
      message: `Mükellef önbelleği güncellendi: ${result.total} kayıt`,
      ...result,
    });
  } catch (err) {
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Geçersiz token" });
    }
    console.error("[sync-mukellef-cache]", err);
    const status = err.message?.includes("401") || err.message?.includes("yetkisi yok") ? 403 : 500;
    return res.status(status).json({
      message: err.message || "Senkronizasyon hatası",
      error: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
}
