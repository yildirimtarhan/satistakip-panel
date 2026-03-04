import { connectToDatabase } from "@/lib/mongodb";

export default async function handler(req, res) {
  try {
    const { db } = await connectToDatabase();
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
