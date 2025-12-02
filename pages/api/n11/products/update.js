// 📁 /pages/api/n11/products/update.js
import axios from "axios";
import xml2js from "xml2js";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ success: false, message: "Only POST allowed" });

  try {
    const { productId, sellerCode, price, stock } = req.body;

    if (!sellerCode)
      return res.status(400).json({ success: false, message: "sellerCode gerekli (SKU)" });

    // N11 Credentials
    const APP_KEY = process.env.N11_APP_KEY;
    const APP_SECRET = process.env.N11_APP_SECRET;

    // 🔥 N11 Batch Update API (Price & Stock)
    const xmlRequest = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
        xmlns:sch="http://www.n11.com/ws/schemas">
        <soapenv:Header/>
        <soapenv:Body>
          <sch:UpdateStockByStockSellerCodeRequest>
            <auth>
              <appKey>${APP_KEY}</appKey>
              <appSecret>${APP_SECRET}</appSecret>
            </auth>
            <stockItems>
              <stockItem>
                <sellerStockCode>${sellerCode}</sellerStockCode>
                <quantity>${stock}</quantity>
                <optionPrice>${price}</optionPrice>
              </stockItem>
            </stockItems>
          </sch:UpdateStockByStockSellerCodeRequest>
        </soapenv:Body>
      </soapenv:Envelope>
    `;

    const response = await axios.post(
      "https://api.n11.com/ws/StockService.svc",
      xmlRequest,
      { headers: { "Content-Type": "text/xml" } }
    );

    const result = await xml2js.parseStringPromise(response.data, { explicitArray: false });
    const resBody = result["s:Envelope"]["s:Body"];

    return res.status(200).json({
      success: true,
      message: "N11 stok & fiyat güncelleme isteği gönderildi",
      raw: resBody,
    });
  } catch (err) {
    console.error("N11 UPDATE ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "N11 ürün güncellenemedi",
      error: err.message,
    });
  }
}
