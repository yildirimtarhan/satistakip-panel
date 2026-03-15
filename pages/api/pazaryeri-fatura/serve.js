/**
 * GET /api/pazaryeri-fatura/serve?orderNumber=XXX&marketplace=pazarama&sig=XXX
 * Pazaryeri (Pazarama vb.) fatura linki olarak kullanılır; sig ile doğrulanır, PDF döner.
 */
import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongodb";

function createSig(orderNumber, marketplace) {
  const secret = process.env.JWT_SECRET || "pazaryeri-fatura-serve";
  return crypto.createHmac("sha256", secret).update(String(orderNumber) + "|" + String(marketplace)).digest("hex");
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ message: "Sadece GET" });

  const { orderNumber, marketplace, sig } = req.query || {};
  if (!orderNumber || !marketplace || !sig) {
    return res.status(400).setHeader("Content-Type", "text/plain").send("orderNumber, marketplace ve sig gerekli");
  }
  const expected = createSig(orderNumber, marketplace);
  if (sig !== expected) {
    return res.status(403).setHeader("Content-Type", "text/plain").send("Geçersiz imza");
  }

  const { db } = await connectToDatabase();
  const doc = await db.collection("pazaryeri_faturalar").findOne({
    orderNumber: String(orderNumber).trim(),
    marketplace: String(marketplace).trim(),
  });
  if (!doc || !doc.pdf) {
    return res.status(404).setHeader("Content-Type", "text/plain").send("Fatura bulunamadı");
  }
  const buf = Buffer.from(doc.pdf, "base64");
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="fatura-${orderNumber}.pdf"`);
  res.setHeader("Cache-Control", "private, max-age=3600");
  return res.send(buf);
}
