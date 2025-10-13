// pages/api/auth/register.js
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST istekleri desteklenmektedir." });
  }

  const { email, password } = req.body;

  try {
    const client = await clientPromise;
    const db = client.db("satistakip");
    const usersCollection = db.collection("users");

    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Bu e-posta zaten kayıtlı." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await usersCollection.insertOne({
      email,
      password: hashedPassword,
      createdAt: new Date(),
    });

    return res.status(201).json({ message: "Kayıt başarılı", userId: result.insertedId });
  } catch (error) {
    console.error("Register API Hatası:", error);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
