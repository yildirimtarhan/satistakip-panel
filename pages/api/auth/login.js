import clientPromise from "@/lib/mongodb";
import { compare } from "bcryptjs";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ message: "Only POST allowed" });

  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Email & password required" });

  try {
    const client = await clientPromise;
    const db = client.db("satistakip");
    const user = await db.collection("users").findOne({ email });

    if (!user)
      return res.status(401).json({ message: "Email veya şifre hatalı" });

    const isMatch = await compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Email veya şifre hatalı" });

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // ✅ Token cookie
    res.setHeader(
      "Set-Cookie",
      `token=${token}; Path=/; HttpOnly; SameSite=Lax; Secure`
    );

    // ✅ Token response (localStorage için)
    return res.status(200).json({
      success: true,
      token,
      user: { email: user.email }
    });

  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
