// GET /api/efatura/draft-pdf?id=... – Taslak fatura PDF indir
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import { buildDraftPdfBuffer } from "@/lib/pdf/efaturaDraftPdf";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET" });
  }

  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Token gerekli" });
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Geçersiz token" });
    }

    const { id } = req.query || {};
    if (!id) return res.status(400).json({ message: "id gerekli" });

    let oid;
    try {
      oid = new ObjectId(id);
    } catch {
      return res.status(400).json({ message: "Geçersiz id" });
    }

    const { db } = await connectToDatabase();
    const draft = await db.collection("efatura_drafts").findOne({
      _id: oid,
      userId: String(decoded.userId),
    });
    if (!draft) return res.status(404).json({ message: "Taslak bulunamadı" });

    const userIdStr = String(decoded.userId || "");
    const companyIdStr = decoded.companyId ? String(decoded.companyId) : null;
    const companyQuery = companyIdStr
      ? { $or: [{ companyId: companyIdStr }, { userId: userIdStr }] }
      : { userId: userIdStr };
    const company = await db.collection("company_settings").findOne(companyQuery) || null;

    const buffer = await buildDraftPdfBuffer(draft, company);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="E-Fatura-Taslak-${id}.pdf"`
    );
    return res.status(200).send(buffer);
  } catch (err) {
    console.error("E-Fatura draft-pdf:", err);
    return res.status(500).json({
      message: err.message || "PDF oluşturulamadı",
    });
  }
}
