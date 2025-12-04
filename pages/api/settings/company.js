// 📁 /pages/api/settings/company.js
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("satistakip");
    const col = db.collection("company_settings");

    // ===============================
    // 🔐 Kullanıcı Doğrulama (JWT)
    // ===============================
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) return res.status(401).json({ message: "Token gerekli!" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Token geçersiz!" });
    }

    const userId = decoded.id || decoded._id;

    // ===============================
    // GET → Firma Ayarlarını Getir
    // ===============================
    if (req.method === "GET") {
      const data = await col.findOne({ userId });

      return res.status(200).json(data || {});
    }

    // ===============================
    // POST → Firma Ayarlarını Kaydet
    // ===============================
    if (req.method === "POST") {
      const body = req.body || {};

      const updateData = {
        userId,
        companyTitle: body.companyTitle || "",
        vknTckn: body.vknTckn || "",
        taxOffice: body.taxOffice || "",
        address: body.address || "",
        phone: body.phone || "",
        email: body.email || "",
        iban: body.iban || "",
        logoBase64: body.logoBase64 || null, // 🔥 LOGO
        signatureNote: body.signatureNote || "", // 🔥 Dipnot / İmza

        // Taxten API Bilgileri
        senderIdentifier: body.senderIdentifier || "",
        efaturaType: body.efaturaType || "TEMEL",
        taxtenUser: body.taxtenUser || "",
        taxtenPass: body.taxtenPass || "",
        taxtenEnv: body.taxtenEnv || "test", // test / live

        updatedAt: new Date(),
      };

      await col.updateOne(
        { userId },
        { $set: updateData },
        { upsert: true }
      );

      return res.status(200).json({ message: "Firma bilgileri kaydedildi" });
    }

    return res.status(405).json({ message: "Method yok" });
  } catch (err) {
    console.log("company settings error:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
