import clientPromise from "@/lib/mongodb";

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db("satistakip");
  const collection = db.collection("urunler");

  if (req.method === "POST") {
    const data = req.body;
    await collection.insertOne(data);
    return res.status(201).json({ message: "Ürün kaydı başarıyla eklendi" });
  }

  if (req.method === "GET") {
    const urunler = await collection.find().toArray();
    return res.status(200).json(urunler);
  }

  res.status(405).json({ message: "Yalnızca GET ve POST destekleniyor" });
}
