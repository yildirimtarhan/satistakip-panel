import fs from "fs";
import path from "path";

export default function handler(req, res) {
  try {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({ message: "PDF adı belirtilmedi." });
    }

    console.log("📄 İstenen PDF:", name);

    // 📌 Doğru dizin (Windows + Linux + Render uyumlu)
    const filePath = path.resolve("./public/teklifler", name);

    console.log("📁 Okunan dosya yolu:", filePath);

    // Dosya var mı?
    if (!fs.existsSync(filePath)) {
      console.log("❌ Dosya bulunamadı:", filePath);
      return res.status(404).json({ message: "Dosya bulunamadı." });
    }

    // Dosyayı oku
    const fileBuffer = fs.readFileSync(filePath);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=${name}`);

    return res.status(200).send(fileBuffer);

  } catch (err) {
    console.error("❌ PDF gösterme hatası:", err);
    return res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
}
