import soap from "soap";
import { getN11SettingsFromRequest } from "@/lib/n11Settings";

export default async function handler(req, res) {
  try {
    const cfg = await getN11SettingsFromRequest(req);

    if (!cfg.appKey || !cfg.appSecret) {
      return res.status(400).json({
        message:
          "N11 API bilgileri bulunamadı. API Ayarları'ndan girin veya ENV tanımlayın.",
      });
    }

    const url =
      cfg.environment === "sandbox"
        ? "https://api.n11.com/ws/ProductService.wsdl"
        : "https://api.n11.com/ws/ProductService.wsdl";

    const client = await soap.createClientAsync(url);

    const requestData = {
      auth: {
        appKey: cfg.appKey,
        appSecret: cfg.appSecret,
      },
      pagingData: {
        currentPage: 0,
        pageSize: 50,
      },
    };

    const [result] = await client.GetProductListAsync(requestData);

    return res.status(200).json({
      source: cfg.source, // ✅ db mi env mi görebilirsin
      data: result,
    });
  } catch (error) {
    console.error("N11 PRODUCT LIST ERROR:", error);
    return res.status(500).json({
      message: "N11 ürün listesi alınamadı",
      error: error?.message || String(error),
    });
  }
}
