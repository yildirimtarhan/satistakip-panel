import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import { getPazaramaToken } from "@/lib/marketplaces/pazaramaService";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET destekleniyor" });
  }

  const creds = await getPazaramaCredentials(req);
  if (!creds?.apiKey || !creds?.apiSecret) {
    return res.status(400).json({
      success: false,
      message: "Pazarama API bilgileri eksik. API Ayarları → Pazarama bölümünden API Key ve API Secret girin.",
    });
  }

  try {
    await getPazaramaToken(creds);

    return res.status(200).json({
      success: true,
      message: "✅ Pazarama API bağlantısı başarılı! Token alındı.",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    const status = err.response?.status;
    if (status === 401) {
      return res.status(401).json({
        success: false,
        message: "Pazarama yetki hatası (401). API Key ve API Secret doğru olmalı (Hesap Bilgileri → Entegrasyon Bilgileri).",
        error: String(msg).slice(0, 200),
      });
    }
    return res.status(500).json({
      success: false,
      message: `❌ Pazarama API bağlantısı başarısız: ${msg}`,
      error: String(msg).slice(0, 300),
    });
  }
}
