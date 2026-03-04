// 📁 /pages/api/efatura/applications.js
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb"; // lib/mongodb.js içindeki helper

export default async function handler(req, res) {
  try {
    // 🔐 Token kontrolü
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return res.status(401).json({ message: "Token eksik" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Geçersiz veya süresi dolmuş token" });
    }

    const userId = decoded.userId || decoded._id || decoded.id;

    const { db } = await connectToDatabase();
    const col = db.collection("efatura_applications");

    // ==========================
    // 📌 POST → Yeni Başvuru
    // ==========================
    if (req.method === "POST") {
      const {
        modules = {},
        packageType = "standart",
        contactName = "",
        contactPhone = "",
        contactEmail = "",
        note = "",
        companyTitle = "",
        vknTckn = "",
        taxOffice = "",
        address = "",
        phone = "",
        email = "",
        website = "",
        logo = "",
        signature = "",
      } = req.body || {};

      if (!modules.efatura && !modules.earsiv && !modules.eirsaliye) {
        return res.status(400).json({
          message: "En az bir modül seçmelisiniz (E-Fatura / E-Arşiv / E-İrsaliye)",
        });
      }
      if (!companyTitle?.trim() || !vknTckn?.trim()) {
        return res.status(400).json({
          message: "Firma ünvanı ve VKN/TCKN zorunludur.",
        });
      }

      const now = new Date();

      const vknClean = String(vknTckn).replace(/\D/g, "").slice(0, 11);
      let userObjectId;
      try {
        userObjectId = new ObjectId(userId);
      } catch (_) {
        userObjectId = null;
      }
      const doc = {
        userId: String(userId),
        userObjectId: userObjectId || undefined,
        companyId: decoded.companyId || null,
        modules: {
          efatura: !!modules.efatura,
          earsiv: !!modules.earsiv,
          eirsaliye: !!modules.eirsaliye,
        },
        packageType,
        contact: {
          name: contactName,
          phone: contactPhone,
          email: contactEmail,
        },
        company: {
          companyTitle: companyTitle.trim(),
          vknTckn: vknClean,
          taxOffice: taxOffice || "",
          address: address || "",
          phone: phone || "",
          email: email || "",
          website: website || "",
        },
        companyTitle: companyTitle.trim(),
        vknTckn: vknClean,
        logo: logo && String(logo).startsWith("data:image") ? logo : "",
        signature: signature && String(signature).startsWith("data:image") ? signature : "",
        note,
        status: "pending",
        adminNote: "",
        adminUserId: null,
        createdAt: now,
        updatedAt: now,
      };

      const result = await col.insertOne(doc);

      // Firma ayarlarına da logo/imza ve temel bilgileri yaz (panel genelinde kullanılsın)
      try {
        const companyCol = db.collection("company_settings");
        const userIdStr = String(userId);
        const companyIdStr = decoded.companyId ? String(decoded.companyId) : null;
        const $set = {
          firmaAdi: companyTitle.trim(),
          vergiNo: String(vknTckn).replace(/\D/g, "").slice(0, 11),
          vergiDairesi: taxOffice || "",
          adres: address || "",
          telefon: phone || contactPhone || "",
          eposta: email || contactEmail || "",
          web: website || "",
          yetkili: contactName || "",
          updatedAt: now,
          userId: userIdStr,
        };
        if (logo && String(logo).startsWith("data:image")) $set.logo = logo;
        if (signature && String(signature).startsWith("data:image")) $set.imza = signature;
        if (companyIdStr) $set.companyId = companyIdStr;

        const existing = await companyCol.findOne({ userId: userIdStr });
        if (existing) {
          await companyCol.updateOne({ _id: existing._id }, { $set });
        } else {
          await companyCol.insertOne({ ...$set, createdAt: now });
        }
      } catch (companyErr) {
        console.warn("company_settings güncellenemedi (başvuru kaydı yine de alındı):", companyErr.message);
      }

      return res.status(200).json({
        success: true,
        message: "Başvurunuz alındı. Yönetici onayından sonra aktif olacaktır.",
        applicationId: result.insertedId,
      });
    }

    // ==========================
    // 📌 GET → Başvurularım
    // ==========================
    if (req.method === "GET") {
      const apps = await col
        .find({ userId: String(userId) })
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json({ applications: apps });
    }

    return res.status(405).json({ message: "Method not allowed" });
  } catch (err) {
    console.error("E-Fatura Başvuru API Hatası:", err);
    return res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
}
