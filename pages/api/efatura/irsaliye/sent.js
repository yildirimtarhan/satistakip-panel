/**
 * Gönderilen E-İrsaliye listesi (yerel veritabanından)
 * GET /api/efatura/irsaliye/sent
 */
import { connectToDatabase } from "@/lib/mongodb";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ message: "Sadece GET" });

  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ message: "Token gerekli" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Geçersiz token" });
    }

    const userId = String(decoded.userId || decoded._id || decoded.id || "");
    const companyId = decoded.companyId ? String(decoded.companyId) : null;
    const tenantFilter = companyId ? { companyId } : { userId };

    const { db } = await connectToDatabase();
    const list = await db
      .collection("efatura_irsaliye_sent")
      .find(tenantFilter)
      .sort({ sentAt: -1 })
      .limit(100)
      .toArray();

    return res.status(200).json(list);
  } catch (err) {
    console.error("İrsaliye sent list:", err);
    return res.status(500).json({ message: err.message });
  }
}
