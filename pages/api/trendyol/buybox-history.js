// 📄 /pages/api/trendyol/buybox-history.js
import clientPromise from "@/lib/mongodb";

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db("satistakip");
  const history = db.collection("buybox_history");

  if (req.method === "POST") {
    // Yeni kayıt ekleme
    const { barcode, suggestedPrice, margin, status } = req.body;
    await history.insertOne({
      barcode,
      suggestedPrice,
      margin,
      status,
      date: new Date(),
    });
    return res.json({ ok: true });
  }

  if (req.method === "GET") {
    const data = await history.find().sort({ date: -1 }).limit(50).toArray();
    return res.json({ ok: true, data });
  }

  return res.status(405).end();
}
