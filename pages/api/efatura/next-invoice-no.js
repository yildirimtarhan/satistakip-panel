// GET → Sıradaki e-fatura numarası (ERP tek kaynak – KT formatı: KT260200000001)
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Counter from "@/models/Counter";
import dbConnect from "@/lib/dbConnect";
import { connectToDatabase } from "@/lib/mongodb";
import { formatEfaturaInvoiceNo } from "@/lib/efatura/nextInvoiceNumber";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET" });
  }

  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return res.status(401).json({ message: "Token yok" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Geçersiz token" });
    }

    const userId = String(decoded.userId || decoded._id || decoded.id || "");
    const companyId = decoded.companyId || userId;
    const companyIdObj = mongoose.Types.ObjectId.isValid(companyId)
      ? new mongoose.Types.ObjectId(companyId)
      : companyId;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Önek: firma ayarından (KT varsayılan)
    const { db } = await connectToDatabase();
    const companyQuery = companyId
      ? { $or: [{ companyId: String(companyId) }, { userId }] }
      : { userId };
    const company = await db.collection("company_settings").findOne(companyQuery);
    const prefix = company?.efaturaFaturaNoPrefix || "KT";

    await dbConnect();
    const doc = await Counter.findOne({ key: "efaturaNo", companyId: companyIdObj, year }).lean();
    const nextSeq = (doc?.seq ?? 0) + 1;
    const invoiceNo = formatEfaturaInvoiceNo(prefix, year, month, nextSeq);

    return res.status(200).json({ invoiceNo, nextSeq, prefix });
  } catch (err) {
    console.error("next-invoice-no:", err);
    return res.status(500).json({ message: err.message || "Numara alınamadı" });
  }
}
