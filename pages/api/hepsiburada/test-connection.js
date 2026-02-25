import jwt from "jsonwebtoken";
import { getHBSettings, getHBToken } from "@/lib/marketplaces/hbService";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false });
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyId = decoded?.companyId;
    const userId = decoded?.userId || decoded?.id || decoded?._id;

    const cfg = await getHBSettings({ companyId, userId });

    if (!cfg.merchantId) {
      return res.status(400).json({
        success: false,
        message: "Merchant ID eksik. API Ayarlari sayfasindan girin veya HEPSIBURADA_MERCHANT_ID env var tanimlayin.",
      });
    }

    if (!cfg.authToken && (!cfg.username || !cfg.password)) {
      return res.status(400).json({
        success: false,
        message: "Kullanici adi / sifre veya HEPSIBURADA_AUTH env var eksik.",
      });
    }

    const tokenObj = await getHBToken(cfg);

    return res.json({
      success: true,
      message: `Baglanti basarili! (${tokenObj.type} auth kullanildi)`,
      testMode: cfg.testMode,
      baseUrl: cfg.baseUrl,
      merchantId: cfg.merchantId,
    });
  } catch (err) {
    const detail = err?.response?.data;
    return res.status(500).json({
      success: false,
      message: detail?.description || detail?.message || err.message,
      detail,
    });
  }
}
