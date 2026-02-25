import jwt from "jsonwebtoken";
import axios from "axios";
import { getN11SettingsFromRequest } from "@/lib/n11Settings";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false });

  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    jwt.verify(token, process.env.JWT_SECRET);

    const { skus } = req.body;
    if (!skus?.length) {
      return res.status(400).json({ success: false, message: "skus dizisi zorunlu" });
    }

    const cfg = await getN11SettingsFromRequest(req);
    if (!cfg?.appKey || !cfg?.appSecret) {
      return res.status(400).json({ success: false, message: "N11 API ayarları eksik" });
    }

    // Doküman: POST https://api.n11.com/ms/product/tasks/price-stock-update
    const response = await axios.post(
      "https://api.n11.com/ms/product/tasks/price-stock-update",
      {
        payload: {
          integrator: cfg.integrator || "SatisTakip",
          skus: skus.map((s) => ({
            stockCode: s.stockCode,
            listPrice: Number(s.listPrice),
            salePrice: Number(s.salePrice),
            quantity: Number(s.quantity ?? 0),
            currencyType: s.currencyType || "TL",
          })),
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          appkey: cfg.appKey,
          appsecret: cfg.appSecret,
        },
        timeout: 15000,
      }
    );

    const taskId = response.data?.id || response.data?.taskId;
    return res.json({
      success: true,
      taskId,
      status: response.data?.status || "IN_QUEUE",
      updatedCount: skus.length,
      message: `${skus.length} ürün N11 güncelleme kuyruğuna alındı`,
    });
  } catch (err) {
    const n11Error = err?.response?.data;
    console.error("N11 BULK UPDATE ERROR:", n11Error || err.message);
    return res.status(500).json({
      success: false,
      message: n11Error?.message || err.message,
      detail: n11Error,
    });
  }
}
