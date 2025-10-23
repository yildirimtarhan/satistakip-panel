// 📁 /pages/api/cari/accounts.js
import clientPromise from "@/lib/mongodb";

export default async function handler(req, res) {
  try {
    // 📌 MongoDB bağlantısı
    const client = await clientPromise;
    const db = client.db("satistakip");
    const accounts = db.collection("accounts");

    if (req.method === "POST") {
      const { name, type } = req.body;

      if (!name || !type) {
        return res
          .status(400)
          .json({ message: "⚠️ Cari adı ve tipi zorunludur." });
      }

      const newAccount = {
        name: name.trim(),
        type, // "customer" veya "supplier"
        balance: 0,
        createdAt: new Date(),
      };

      const result = await accounts.insertOne(newAccount);
      return res
        .status(201)
        .json({ message: "✅ Cari hesap eklendi", accountId: result.insertedId });
    }

    if (req.method === "GET") {
      const list = await accounts.find().sort({ createdAt: -1 }).toArray();
      return res.status(200).json(list);
    }

    return res
      .status(405)
      .json({ message: "❌ Yalnızca GET ve POST metodları desteklenir." });
  } catch (error) {
    console.error("🔥 Cari API Hatası:", error);
    return res.status(500).json({
      message: "Sunucu hatası. Lütfen tekrar deneyin.",
      error: error.message,
    });
  }
}
