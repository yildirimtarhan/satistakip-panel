// pages/api/auth/register.js

import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST istekleri destekleniyor." });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email ve şifre zorunludur." });
  }

  try {
    const client = await clientPromise;
    const db = client.db("satistakip");
    const usersCollection = db.collection("users");

    const existingUser = await usersCollection.findOne({ email });

    if (existingUser) {
      return res.status(409).json({ message: "Bu email zaten kayıtlı." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await usersCollection.insertOne({ email, password: hashedPassword });

    return res.status(201).json({ message: "Kayıt başarılı." });
  } catch (error) {
    console.error("Kayıt sırasında hata:", error);
    return res.status(500).json({ message: "Sunucu hatası." });
  }
}
