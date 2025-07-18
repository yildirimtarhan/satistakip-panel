import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

// Kullanıcı verileri dosyası
const dataFile = path.join(process.cwd(), "data", "users.json");

function readUsers() {
  return fs.existsSync(dataFile)
    ? JSON.parse(fs.readFileSync(dataFile, "utf8"))
    : [];
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Sadece POST isteklerine izin verilir." });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email ve şifre zorunludur." });
  }

  const users = readUsers();
  const user = users.find((u) => u.email === email);

  if (!user) {
    return res.status(401).json({ error: "Kullanıcı bulunamadı." });
  }

  const passwordMatch = await bcrypt.compare(password, user.password);

  if (!passwordMatch) {
    return res.status(401).json({ error: "Şifre yanlış." });
  }

  // Gerçek uygulamada burada JWT döndürmelisin
  return res.status(200).json({
    message: "Giriş başarılı.",
    user: { id: user.id, email: user.email },
  });
}
