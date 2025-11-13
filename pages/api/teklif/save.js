import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Only POST allowed" });
  }

  try {
    const { fileName, pdfBase64 } = req.body || {};

    if (!fileName || !pdfBase64) {
      return res.status(400).json({ message: "Eksik parametre: fileName veya pdfBase64 yok" });
    }

    // 📌 PDF kaydedilecek dizin (her zaman doğru yolu verir!)
    const saveDir = path.resolve("./public/teklifler");

    // 📁 Klasör yoksa oluştur
    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true });
      console.log("📂 Klasör oluşturuldu:", saveDir);
    }

    // 📄 Kaydedilecek dosya yolu
    const filePath = path.join(saveDir, fileName);

    console.log("📁 PDF şu konuma kaydedilecek:", filePath);

    // Base64 -> Buffer dönüştür
    const buffer = Buffer.from(pdfBase64, "base64");

    // 📌 Dosyayı yaz
    fs.writeFileSync(filePath, buffer);

    return res.status(200).json({
      message: "PDF başarıyla kaydedildi",
      filePath: `/teklifler/${fileName}`
    });

  } catch (err) {
    console.error("❌ PDF kaydedilirken hata:", err);
    return res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
}
