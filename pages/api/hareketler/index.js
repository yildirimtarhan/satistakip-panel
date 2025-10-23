import clientPromise from "@/lib/mongodb";

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db("satistakip");
  const collection = db.collection("hareketler");

  if (req.method === "POST") {
    const data = req.body;
    await collection.insertOne(data);
    return res.status(201).json({ message: "Cari hareket başarıyla kaydedildi" });
  }

  if (req.method === "GET") {
    const hareketler = await collection.find().toArray();
    return res.status(200).json(hareketler);
  }

  res.status(405).json({ message: "Yalnızca GET ve POST destekleniyor" });
}
