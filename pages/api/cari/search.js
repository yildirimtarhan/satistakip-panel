// 📁 /pages/api/cari/search.js
import dbConnect from "@/lib/mongodb";
import Cari from "@/models/Cari";

function escapeRegex(str = "") {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Only POST" });
  }

  const { email = "", phone = "", fullName = "" } = req.body || {};

  if (!email && !phone && !fullName) {
    return res.status(400).json({
      success: false,
      message: "En az bir alan gerekli: email, phone veya fullName",
    });
  }

  await dbConnect();

  const orConditions = [];

  // 📧 E-posta tam eşleşme
  if (email) {
    orConditions.push({
      email: { $regex: "^" + escapeRegex(email) + "$", $options: "i" },
    });
  }

  // 📱 Telefon – sadece rakamlar, son 7–10 haneye göre
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length >= 7) {
    const last7 = digits.slice(-7);
    orConditions.push({
      telefon: { $regex: last7, $options: "i" },
    });
  }

  // 🧑 İsim – parçalı regex
  if (fullName) {
    const words = fullName
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (words.length > 0) {
      const pattern = words.map(escapeRegex).join(".*");
      orConditions.push({
        ad: { $regex: pattern, $options: "i" },
      });
    }
  }

  if (orConditions.length === 0) {
    return res.status(200).json({ success: true, results: [] });
  }

  const cariler = await Cari.find({ $or: orConditions })
    .limit(15)
    .lean();

  // Basit skor hesaplama
  const lowerEmail = email.toLowerCase();
  const lowerPhone = digits;

  const results = cariler
    .map((c) => {
      let score = 0;

      if (lowerEmail && c.email && c.email.toLowerCase() === lowerEmail) {
        score += 3;
      }

      const cDigits = (c.telefon || "").replace(/\D/g, "");
      if (lowerPhone && cDigits.endsWith(lowerPhone.slice(-7))) {
        score += 2;
      }

      if (
        fullName &&
        c.ad &&
        c.ad.toLowerCase().includes(fullName.toLowerCase())
      ) {
        score += 1;
      }

      return {
        _id: c._id.toString(),
        ad: c.ad,
        telefon: c.telefon,
        email: c.email,
        il: c.il,
        ilce: c.ilce,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);

  return res.status(200).json({
    success: true,
    count: results.length,
    results,
  });
}
