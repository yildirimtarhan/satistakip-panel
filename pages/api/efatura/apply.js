// 📁 /pages/api/efatura/apply.js
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return res.status(401).json({ message: "Token gerekli" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Geçersiz token" });
    }

    const userId = decoded.userId || decoded.id || decoded._id;
    if (!userId) {
      return res.status(400).json({ message: "Kullanıcı bilgisi bulunamadı" });
    }

    const { db } = await connectToDatabase();
    const col = db.collection("efatura_applications");

    // 🧾 Kullanıcının mevcut başvurusu
    const userObjectId = new ObjectId(userId);

    if (req.method === "GET") {
      const app = await col.findOne({ userObjectId });
      return res.status(200).json({ application: app || null });
    }

    if (req.method === "POST") {
      const body = req.body || {};
      const {
        companyTitle,
        vknTckn,
        taxOffice,
        address,
        phone,
        email,
        website,
        iban,
        contactName,
        senderIdentifier,
        taxtenMode = "test", // test / live
        taxtenClientId,
        taxtenApiKey,
        note = "",
      } = body;

      if (!companyTitle || !vknTckn) {
        return res
          .status(400)
          .json({ message: "Firma adı ve VKN/TCKN zorunlu" });
      }

      const now = new Date();

      const doc = {
        userId: String(userId),
        userObjectId,
        companyTitle,
        vknTckn,
        taxOffice: taxOffice || "",
        address: address || "",
        phone: phone || "",
        email: email || "",
        website: website || "",
        iban: iban || "",
        contactName: contactName || "",
        senderIdentifier: senderIdentifier || "",
        provider: "TAXTEN",
        taxtenMode,
        taxtenClientId: taxtenClientId || "",
        taxtenApiKey: taxtenApiKey || "",
        note,
        status: "pending", // her kayıtta yeniden beklemeye alınır
        updatedAt: now,
      };

      const existing = await col.findOne({ userObjectId });

      if (existing) {
        await col.updateOne(
          { _id: existing._id },
          {
            $set: doc,
            $setOnInsert: { createdAt: existing.createdAt || now },
          }
        );
      } else {
        await col.insertOne({ ...doc, createdAt: now });
      }

      return res.status(200).json({
        success: true,
        message: "Başvurunuz alındı. Yönetici onayını bekliyor.",
      });
    }

    return res.status(405).json({ message: "Method not allowed" });
  } catch (err) {
    console.error("EFATURA APPLY ERROR:", err);
    return res
      .status(500)
      .json({ message: "Sunucu hatası", error: err.message });
  }
}
