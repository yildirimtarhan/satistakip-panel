// 📁 /pages/api/export/cari.js
import XLSX from "xlsx";
import { connectToDatabase } from "@/lib/mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Yalnızca GET istekleri destekleniyor." });
  }

  try {
    const { db } = await connectToDatabase();
    const cariListesi = await db.collection("cari").find({}).toArray();

    if (!cariListesi || cariListesi.length === 0) {
      return res.status(404).json({ message: "Hiç cari kaydı bulunamadı." });
    }

    // 📊 JSON → XLSX dönüştür
    const ws = XLSX.utils.json_to_sheet(cariListesi);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cari Listesi");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // 📦 Yanıt olarak Excel dosyası döndür
    res.setHeader("Content-Disposition", "attachment; filename=cari_listesi.xlsx");
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buffer);
  } catch (error) {
    console.error("📤 Export hatası:", error);
    res.status(500).json({ message: "Export hatası", error: error.message });
  }
}
