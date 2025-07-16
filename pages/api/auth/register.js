import clientPromise from "../../lib/mongodb";
import bcrypt from "bcrypt";
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Yalnızca POST isteği desteklenir" });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "E-posta ve şifre gerekli" });
  }

  try {
    const client = await clientPromise;
    const db = client.db("satistakip");
    const users = db.collection("users");

    const existingUser = await users.findOne({ email });

    if (existingUser) {
      return res.status(409).json({ message: "Bu e-posta zaten kayıtlı" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await users.insertOne({ email, password: hashedPassword });

    return res.status(201).json({ message: "Kayıt başarılı!" });
  } catch (error) {
    console.error("Kayıt Hatası:", error);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
