import axios from "axios";
import { getN11SettingsFromRequest } from "@/lib/n11Settings";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Only POST allowed" });
  }

  try {
    // ✅ DB settings + ENV fallback
    const cfg = await getN11SettingsFromRequest(req);

    const appKey = cfg.appKey || process.env.N11_APP_KEY || "";
    const appSecret = cfg.appSecret || process.env.N11_APP_SECRET || "";

    if (!appKey || !appSecret) {
      return res.status(400).json({
        success: false,
        message:
          "N11 API bilgileri bulunamadı. API Ayarları veya ENV girilmelidir.",
      });
    }

    const { shipmentPackageId } = req.body || {};
    if (!shipmentPackageId) {
      return res.status(400).json({
        success: false,
        message: "shipmentPackageId zorunlu",
      });
    }

    const url = `https://api.n11.com/rest/delivery/v1/shipmentPackages/${shipmentPackageId}`;

    const response = await axios.get(url, {
      headers: {
        appKey,
        appSecret,
      },
      timeout: 30000,
    });

    return res.status(200).json({
      success: true,
      source: cfg.source || "env",
      data: response.data,
    });
  } catch (err) {
    console.error("N11 SHIPMENT ERROR:", err?.response?.data || err);
    return res.status(500).json({
      success: false,
      message: "N11 shipment detayı alınamadı",
      error: err?.response?.data || err?.message || String(err),
    });
  }
}
