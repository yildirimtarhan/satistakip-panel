import clientPromise from "@/lib/mongodb";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  try {
    // Token kontrolü
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Token eksik" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const client = await clientPromise;
    const db = client.db("satistakip");
    const collection = db.collection("accounts"); // cari kayıtları burada tutulacak

    if (req.method === "GET") {
      const list = await collection.find({ userId: decoded.userId }).toArray();
      return res.status(200).json(list);
    }

    if (req.method === "POST") {
      const body = req.body;
      await collection.insertOne({
        ...body,
        userId: decoded.userId,
        createdAt: new Date(),
      });
      return res.status(201).json({ message: "Cari başarıyla eklendi" });
    }

    res.status(405).json({ message: "Yalnızca GET ve POST desteklenir" });
  } catch (err) {
    console.error("Cari API hatası:", err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
}

