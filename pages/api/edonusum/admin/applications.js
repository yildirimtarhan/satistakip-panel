// 📁 /pages/api/edonusum/admin/applications.js
import dbConnect from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  try {
    await dbConnect();

    // 🔐 Token
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return res.status(401).json({ message: "Token gerekli" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Yetkisiz erişim" });
    }

    const conn = await dbConnect();
    const db = conn.connection.db;
    // E-Fatura başvuruları efatura_applications koleksiyonuna kaydediliyor
    const col = db.collection("efatura_applications");

    // 📌 GET → Liste (panel contactName/contactEmail bekliyor; API contact.name/contact.email dönüyor)
    if (req.method === "GET") {
      const list = await col.find({}).sort({ createdAt: -1 }).toArray();
      const items = list.map((item) => ({
        ...item,
        contactName: item.contact?.name ?? item.contactName ?? "-",
        contactEmail: item.contact?.email ?? item.contactEmail ?? "-",
        contactPhone: item.contact?.phone ?? item.contactPhone ?? "",
      }));
      return res.status(200).json({ success: true, items });
    }

    // 📌 PUT → Onay / Red
    if (req.method === "PUT") {
      const { id, status, adminNote } = req.body;
      const idStr = typeof id === "string" ? id : id?.toString?.();

      if (!idStr || !status) {
        return res.status(400).json({ message: "id ve status zorunlu" });
      }

      let oid;
      try {
        oid = new ObjectId(idStr);
      } catch {
        return res.status(400).json({ message: "Geçersiz başvuru id" });
      }

      const result = await col.updateOne(
        { _id: oid },
        {
          $set: {
            status,
            adminNote: adminNote || "",
            updatedAt: new Date(),
          },
        }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: "Başvuru bulunamadı" });
      }
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ message: "Method desteklenmiyor" });
  } catch (err) {
    console.error("Admin applications API error:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
