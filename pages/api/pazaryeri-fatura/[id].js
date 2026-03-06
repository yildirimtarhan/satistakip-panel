/**
 * GET /api/pazaryeri-fatura/[id] — Tek fatura PDF indir (base64 döner veya Content-Type: application/pdf)
 */
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ message: "Sadece GET" });
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "")?.trim();
  if (!token || !process.env.JWT_SECRET) return res.status(401).json({ message: "Token gerekli" });
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Geçersiz token" });
  }
  const userId = String(decoded.userId || "");
  const id = req.query.id;
  if (!id) return res.status(400).json({ message: "id gerekli" });
  let oid;
  try {
    oid = new ObjectId(id);
  } catch {
    return res.status(400).json({ message: "Geçersiz id" });
  }
  const { db } = await connectToDatabase();
  const doc = await db.collection("pazaryeri_faturalar").findOne({ _id: oid, userId });
  if (!doc) return res.status(404).json({ message: "Fatura bulunamadı" });
  if (!doc.pdf) return res.status(404).json({ message: "PDF verisi yok" });
  const buf = Buffer.from(doc.pdf, "base64");
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="pazaryeri-fatura-${doc.orderNumber || id}.pdf"`);
  res.setHeader("Cache-Control", "no-store");
  return res.send(buf);
}
