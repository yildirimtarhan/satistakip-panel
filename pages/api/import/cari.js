// 📁 /pages/api/import/cari.js
import formidable from "formidable";
import XLSX from "xlsx";
import fs from "fs";
import { connectToDatabase } from "@/lib/mongodb";

// Next.js'in bodyParser'ı devre dışı bırakılmalı:
export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Yalnızca POST destekleniyor" });
  }

  const form = new formidable.IncomingForm({ keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Form parse hatası:", err);
      return res.status(500).json({ error: "Dosya yükleme hatası" });
    }

    try {
      const file = files.file?.[0];
      if (!file) {
        return res.status(400).json({ error: "Excel dosyası bulunamadı" });
      }

      // 📄 Excel oku
      const workbook = XLSX.readFile(file.filepath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet);

      if (!data.length) {
        return res.status(400).json({ error: "Excel dosyası boş" });
      }

      const { db } = await connectToDatabase();
      await db.collection("cari").insertMany(data);

      fs.unlinkSync(file.filepath); // geçici dosyayı sil
      return res.status(200).json({ message: "Import başarılı", kayit: data.length });
    } catch (error) {
      console.error("Import hatası:", error);
      return res.status(500).json({ error: "Import başarısız", detay: error.message });
    }
  });
}
