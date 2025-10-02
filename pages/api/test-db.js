// pages/api/test-db.js
import dbConnect from "@/lib/mongodb";

export default async function handler(req, res) {
  try {
    const conn = await dbConnect();
    res.status(200).json({ message: "MongoDB bağlantısı başarılı ✅" });
  } catch (error) {
    res.status(500).json({ message: "MongoDB bağlantısı başarısız ❌", error: error.message });
  }
}
