import { getPttAvmCredentials } from "@/lib/getPttAvmCredentials";
import { pttAvmTestConnection } from "@/lib/marketplaces/pttAvmService";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET destekleniyor" });
  }

  const creds = await getPttAvmCredentials(req);
  if (!creds?.apiKey || !creds?.accessToken) {
    return res.status(400).json({
      success: false,
      message: "PTT AVM API bilgileri eksik. API Ayarları → PTT AVM bölümünden Api-Key ve access-token girin.",
    });
  }

  try {
    await pttAvmTestConnection(creds);
    return res.status(200).json({
      success: true,
      message: "✅ PTT AVM API bağlantısı başarılı!",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    const status = err.response?.status;
    if (status === 401) {
      return res.status(401).json({
        success: false,
        message: "PTT AVM yetki hatası (401). Api-Key ve access-token doğru olmalı (Hesap Yönetimi → Entegrasyon Bilgileri).",
        error: String(msg).slice(0, 200),
      });
    }
    return res.status(500).json({
      success: false,
      message: `❌ PTT AVM API bağlantısı başarısız: ${msg}`,
      error: String(msg).slice(0, 300),
    });
  }
}
