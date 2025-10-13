// pages/api/hepsiburada-api/orders/webhook.js
import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST istekleri desteklenmektedir." });
  }

  try {
    const body = req.body;
    console.log("📩 [HB Webhook] Yeni event alındı:", JSON.stringify(body, null, 2));

    // Log dosyasına da yazalım
    const logDir = path.join(process.cwd(), "logs");
    const logFile = path.join(logDir, "webhook.log");

    // Klasör yoksa oluştur
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir);
    }

    const logEntry = `[${new Date().toISOString()}] ${JSON.stringify(body)}\n`;
    fs.appendFileSync(logFile, logEntry, "utf8");

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Webhook İşleme Hatası:", error);
    return res.status(500).json({ message: "Webhook işleme hatası", error: error.message });
  }
}
