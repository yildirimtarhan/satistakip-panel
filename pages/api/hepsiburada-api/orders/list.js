import clientPromise from "@/lib/mongodb";

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("satistakip");
    const collection = db.collection("orderDetails");

    const orders = await collection
      .find({})
      .sort({ fetchedAt: -1 })
      .limit(50)
      .toArray();

    return res.status(200).json({ orders });
  } catch (error) {
    console.error("Sipariş listesi alınamadı:", error);
    return res.status(500).json({ error: error.message });
  }
}
