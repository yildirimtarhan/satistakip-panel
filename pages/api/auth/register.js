import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

// Kullanıcı verilerinin tutulduğu JSON dosyası
const dataFile = path.join(process.cwd(), "data", "users.json");

function readUsers() {
  return fs.existsSync(dataFile)
    ? JSON.parse(fs.readFileSync(dataFile, "utf8"))
    : [];
}

function writeUsers(users) {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  fs.writeFileSync(dataFile, JSON.stringify(users, null, 2));
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

  const userExists = users.find((user) => user.email === email);
  if (userExists) {
    return res.status(400).json({ error: "Bu e-posta zaten kayıtlı." });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const newUser = {
    id: Date.now(),
    email,
    password: hashedPassword,
  };

  users.push(newUser);
  writeUsers(users);

  return res.status(201).json({ message: "Kullanıcı başarıyla kaydedildi." });
}
