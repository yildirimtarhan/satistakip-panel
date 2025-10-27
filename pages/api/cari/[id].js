import clientPromise from "@/lib/mongodb";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  const { id } = req.query;
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Yetkisiz erişim" });

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    const client = await clientPromise;
    const db = client.db("satistakip");
    const collection = db.collection("cari");

    if (req.method === "PUT") {
      const updateData = req.body;
      await collection.updateOne({ _id: id }, { $set: updateData });
      return res.status(200).json({ message: "Cari güncellendi ✅" });
    }

    if (req.method === "DELETE") {
      await collection.deleteOne({ _id: id });
      return res.status(200).json({ message: "Cari silindi ❌" });
    }

    res.status(405).json({ error: "Geçersiz istek yöntemi" });
  } catch (err) {
    res.status(401).json({ error: "Token hatalı veya süresi dolmuş" });
  }
}
