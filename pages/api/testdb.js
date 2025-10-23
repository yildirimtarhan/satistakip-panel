import clientPromise from "@/lib/mongodb";

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("satistakip");
    const collections = await db.listCollections().toArray();

    res.status(200).json({
      message: "MongoDB bağlantısı başarılı ✅",
      collections: collections.map((c) => c.name),
    });
  } catch (error) {
    console.error("MongoDB hata:", error);
    res.status(500).json({
      message: "MongoDB bağlantısı başarısız ❌",
      error: error.message,
    });
  }
}
