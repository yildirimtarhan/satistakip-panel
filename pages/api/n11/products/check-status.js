import axios from "axios";
import xml2js from "xml2js";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import { getN11SettingsFromRequest } from "@/lib/n11Settings";

const N11_URL = "https://api.n11.com/ws/ProductService.svc";

export default async function handler(req, res) {
  try {
    await dbConnect();

    // ✅ DB settings + ENV fallback
    const cfg = await getN11SettingsFromRequest(req);

    if (!cfg.appKey || !cfg.appSecret) {
      return res.status(400).json({
        success: false,
        message:
          "N11 API bilgileri bulunamadı. API Ayarları'ndan girin veya ENV tanımlayın.",
      });
    }

    // 1) N11'e gönderilmiş ama onaylanmamış ürünleri bul
    const waitingProducts = await Product.find({
      "marketplaces.n11.status": { $in: ["Pending Approval", "Sent"] },
    }).limit(10);

    if (waitingProducts.length === 0) {
      return res.json({ success: true, message: "Kontrol edilecek ürün yok." });
    }

    let results = [];

    for (const product of waitingProducts) {
      const productId = product.marketplaces?.n11?.productId;
      if (!productId) continue;

      // 2) XML isteği hazırla
      const xml = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
        xmlns:sch="http://www.n11.com/ws/schemas">
        <soapenv:Header/>
        <soapenv:Body>
          <sch:GetProductByProductIdRequest>
            <auth>
              <appKey>${cfg.appKey}</appKey>
              <appSecret>${cfg.appSecret}</appSecret>
            </auth>
            <productId>${productId}</productId>
          </sch:GetProductByProductIdRequest>
        </soapenv:Body>
      </soapenv:Envelope>
      `;

      // 3) SOAP isteği gönder
      const response = await axios.post(N11_URL, xml, {
        headers: { "Content-Type": "text/xml;charset=UTF-8" },
      });

      // 4) XML → JSON parse et
      const parsed = await xml2js.parseStringPromise(response.data, {
        explicitArray: false,
      });

      const body =
        parsed?.["s:Envelope"]?.["s:Body"]?.["GetProductByProductIdResponse"]?.[
          "GetProductByProductIdResult"
        ];

      const status = body?.status?.status;
      const message = body?.status?.message;

      // Eğer N11 hata döndüyse → işlem yok
      if (status !== "success") {
        results.push({ productId, status: "N11 Error", message });
        continue;
      }

      const n11Product = body.product;

      // 5) Onay durumunu oku
      const approvalState = n11Product?.approvalStatus; // approved, waiting, rejected

      let newStatus = "Pending Approval";
      if (approvalState === "approved") newStatus = "Approved";
      if (approvalState === "rejected") newStatus = "Rejected";

      // 6) DB güncelle
      product.marketplaces.n11.status = newStatus;
      product.marketplaces.n11.updatedAt = new Date();
      await product.save();

      results.push({ productId, newStatus });
    }

    return res.json({
      success: true,
      source: cfg.source || "env",
      checked: results.length,
      results,
    });
  } catch (err) {
    console.error("N11 Status Cron Error:", err);
    return res.status(500).json({
      success: false,
      message: "Cron işleme hatası",
      error: err.message,
    });
  }
}
