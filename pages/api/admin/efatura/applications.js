// 📁 /pages/api/admin/efatura/applications.js
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  try {
    // 🔐 Admin kontrolü
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

    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Bu işlem için yetkiniz yok" });
    }

    const client = await clientPromise;
    const db = client.db("satistakip");
    const appsCol = db.collection("efatura_applications");
    const usersCol = db.collection("users");

    if (req.method === "GET") {
      const status = req.query.status;
      const filter = status ? { status } : {};

      const apps = await appsCol.find(filter).sort({ createdAt: -1 }).toArray();

      // Kullanıcı bilgilerini toparla
      const userIds = [...new Set(apps.map((a) => a.userObjectId).filter(Boolean))];

      const users = userIds.length
        ? await usersCol
            .find({ _id: { $in: userIds } }, { projection: { password: 0 } })
            .toArray()
        : [];

      const usersById = {};
      users.forEach((u) => {
        usersById[String(u._id)] = u;
      });

      const enriched = apps.map((a) => ({
        ...a,
        user: usersById[String(a.userObjectId)] || null,
      }));

      return res.status(200).json({ applications: enriched });
    }

    if (req.method === "POST") {
      const { id, status, adminNote = "" } = req.body || {};

      if (!id || !["approved", "rejected", "pending"].includes(status)) {
        return res
          .status(400)
          .json({ message: "Geçersiz id veya status değeri" });
      }

      const _id = new ObjectId(id);
      const app = await appsCol.findOne({ _id });

      if (!app) {
        return res.status(404).json({ message: "Başvuru bulunamadı" });
      }

      const now = new Date();

      await appsCol.updateOne(
        { _id },
        {
          $set: {
            status,
            adminNote,
            adminId: decoded.userId || decoded._id,
            decidedAt: now,
          },
        }
      );

      // ✅ Onaylandıysa kullanıcı efatura alanını güncelle
      if (status === "approved") {
        await usersCol.updateOne(
          { _id: app.userObjectId },
          {
            $set: {
              "efatura.provider": "taxten",
              "efatura.vkn": app.vknTckn,
              "efatura.firmaUnvan": app.companyTitle,
            },
          }
        );
      }

      return res.status(200).json({ message: "Başvuru güncellendi" });
    }

    return res.status(405).json({ message: "Method not allowed" });
  } catch (err) {
    console.error("ADMIN EFATURA APPLICATIONS ERROR:", err);
    return res
      .status(500)
      .json({ message: "Sunucu hatası", error: err.message });
  }
}
