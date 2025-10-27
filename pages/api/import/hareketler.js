import clientPromise from "@/lib/mongodb";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Token gerekli" });

    jwt.verify(token, process.env.JWT_SECRET);

    const { data } = req.body;
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ message: "Geçersiz veri" });
    }

    const client = await clientPromise;
    const db = client.db("satistakip");
    const collection = db.collection("hareketler");

    const docs = data.map((item) => ({
      cariId: item.cariId || null,
      aciklama: item.aciklama || "",
      tutar: Number(item.tutar || 0),
      tur: item.tur || "Satış", // Satış, Alış, Tahsilat, Ödeme
      tarih: item.tarih ? new Date(item.tarih) : new Date(),
      createdAt: new Date(),
    }));

    await collection.insertMany(docs);
    return res.status(200).json({ message: `${docs.length} hareket başarıyla eklendi` });
  } catch (err) {
    console.error("Hareket import hatası:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
