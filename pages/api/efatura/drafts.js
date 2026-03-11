// 📁 /pages/api/efatura/drafts.js
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  try {
    const { db } = await connectToDatabase();
    const col = db.collection("efatura_drafts");

    // 🔐 Kullanıcı doğrulama
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
    } catch {
      return res.status(401).json({ message: "Token geçersiz" });
    }

    const userId = decoded.userId;
    const companyId = decoded.companyId;

    if (!companyId) {
      return res.status(400).json({ message: "Oturumda firma bilgisi bulunamadı." });
    }

    // 📌 1) TASLAK OLUŞTURMA (POST)
    if (req.method === "POST") {
      const body = req.body || {};
      const {
        customer,
        accountId,
        items = [],
        notes = "",
        invoiceType = "EARSIV",
        scenario = "TICARI",
        totals = {},
        vadeTarihi,
        genelIskontoOrani,
        genelIskontoTutar,
      } = body;

      if (!customer || !customer.title) {
        return res.status(400).json({ message: "Müşteri bilgisi eksik" });
      }

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "En az bir ürün eklemelisiniz" });
      }

      const uuid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const draft = {
        userId,
        companyId: String(companyId), // Çoklu kiracı (Tenant) desteği
        uuid,
        invoiceType,
        scenario: scenario === "TEMEL" ? "TEMEL" : "TICARI",
        customer,
        ...(accountId && { accountId: String(accountId) }),
        items,
        notes,
        totals,
        ...(vadeTarihi && { vadeTarihi }),
        ...(genelIskontoOrani != null && { genelIskontoOrani: Number(genelIskontoOrani) }),
        ...(genelIskontoTutar != null && { genelIskontoTutar: Number(genelIskontoTutar) }),
        createdAt: new Date(),
      };

      await col.insertOne(draft);

      return res.status(200).json({
        message: "Taslak oluşturuldu",
        draft,
      });
    }

    // 📌 2) TASLAK GÜNCELLE (PUT)
    if (req.method === "PUT") {
      const { id } = req.query;
      if (!id) return res.status(400).json({ message: "ID eksik" });
      let oid;
      try {
        oid = new ObjectId(id);
      } catch {
        return res.status(400).json({ message: "Geçersiz id" });
      }
      const body = req.body || {};
      const {
        customer,
        accountId,
        items = [],
        notes = "",
        invoiceType = "EARSIV",
        scenario = "TICARI",
        totals = {},
        vadeTarihi,
        genelIskontoOrani,
        genelIskontoTutar,
      } = body;
      
      if (!customer || !customer.title) {
        return res.status(400).json({ message: "Müşteri bilgisi eksik" });
      }
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "En az bir ürün eklemelisiniz" });
      }
      
      const update = {
        invoiceType,
        scenario: scenario === "TEMEL" ? "TEMEL" : "TICARI",
        customer,
        ...(accountId !== undefined && { accountId: accountId ? String(accountId) : null }),
        items,
        notes,
        totals,
        ...(vadeTarihi && { vadeTarihi }),
        ...(genelIskontoOrani != null && { genelIskontoOrani: Number(genelIskontoOrani) }),
        ...(genelIskontoTutar != null && { genelIskontoTutar: Number(genelIskontoTutar) }),
        updatedAt: new Date(),
      };
      
      const result = await col.findOneAndUpdate(
        { _id: oid, companyId: String(companyId) },
        { $set: update },
        { returnDocument: "after" }
      );
      
      if (!result.value && !result.ok) {
        return res.status(404).json({ message: "Taslak bulunamadı veya bu veriye erişim yetkiniz yok" });
      }
      
      const draft = await col.findOne({ _id: oid, companyId: String(companyId) });
      return res.status(200).json({ message: "Taslak güncellendi", draft: draft || result.value });
    }

    // 📌 3) TÜM TASLAKLARI GETİR veya TEK TASLAK (id ile)
    if (req.method === "GET") {
      const { id } = req.query;
      
      if (id) {
        let oid;
        try {
          oid = new ObjectId(id);
        } catch {
          return res.status(400).json({ message: "Geçersiz id" });
        }
        const draft = await col.findOne({ _id: oid, companyId: String(companyId) });
        if (!draft) return res.status(404).json({ message: "Taslak bulunamadı" });
        return res.status(200).json(draft);
      }
      
      const drafts = await col
        .find({ companyId: String(companyId) })
        .sort({ createdAt: -1 })
        .toArray();
      return res.status(200).json(drafts);
    }

    // 📌 4) TASLAK SİL (DELETE)
    if (req.method === "DELETE") {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ message: "ID eksik" });
      }

      const delResult = await col.deleteOne({
        _id: new ObjectId(id),
        companyId: String(companyId),
      });

      if (delResult.deletedCount === 0) {
          return res.status(404).json({ message: "Taslak bulunamadı veya silme yetkiniz yok" });
      }

      return res.json({ message: "Taslak silindi" });
    }

    return res.status(405).json({ message: "Method not allowed" });
  } catch (err) {
    console.error("DRAFT ERROR:", err);
    return res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
}
