// 📁 /pages/api/import/cari.js
import fs from "fs";
import path from "path";
import formidable from "formidable";
import XLSX from "xlsx";
import { connectToDatabase } from "@/lib/mongodb";

// 🔧 Next.js varsayılan bodyParser'ı kapat
export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Yalnızca POST destekleniyor." });
  }

  try {
    // ✅ Render'da dosya kaydetmek için geçici dizin ayarla
    const uploadDir = path.join(process.cwd(), "/tmp");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }

    const form = formidable({
      multiples: false,
      uploadDir,
      keepExtensions: true,
    });

    // Parse işlemini Promise yapısında çalıştır
    const [fields, files] = await form.parse(req);
    const file = files.file?.[0];

    if (!file || !file.filepath) {
      return res.status(400).json({ error: "Excel dosyası yüklenemedi." });
    }

    // 📖 Excel dosyasını oku
    const workbook = XLSX.readFile(file.filepath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet);

    if (!jsonData || jsonData.length === 0) {
      return res.status(400).json({ error: "Excel dosyası boş veya geçersiz." });
    }

    // 🔗 MongoDB bağlantısı
    const { db } = await connectToDatabase();

    // JSON verilerini doğrudan koleksiyona ekle
    const result = await db.collection("cari").insertMany(jsonData);

    // ✅ Geçici dosyayı sil
    fs.unlinkSync(file.filepath);

    return res.status(200).json({
      message: "Import başarılı",
      eklenenKayit: result.insertedCount,
    });
  } catch (error) {
    console.error("📤 Import hata:", error);
    return res.status(500).json({
      error: "Import başarısız",
      detay: error.message,
    });
  }
}
