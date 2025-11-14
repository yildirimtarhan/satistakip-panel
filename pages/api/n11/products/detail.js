// 📌 /pages/api/n11/products/detail.js
import axios from "axios";
import xml2js from "xml2js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST destekleniyor" });
  }

  try {
    const { sellerCode } = req.body;

    if (!sellerCode) {
      return res.status(400).json({ success: false, message: "sellerCode gerekli" });
    }

    const appKey = process.env.N11_API_KEY;
    const appSecret = process.env.N11_API_SECRET;
    const baseUrl = process.env.N11_BASE_URL || "https://api.n11.com/ws";

    const xmlBody = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                        xmlns:sch="http://www.n11.com/ws/schemas">
        <soapenv:Header/>
        <soapenv:Body>
          <sch:GetProductBySellerCodeRequest>
            <auth>
              <appKey>${appKey}</appKey>
              <appSecret>${appSecret}</appSecret>
            </auth>
            <sellerCode>${sellerCode}</sellerCode>
          </sch:GetProductBySellerCodeRequest>
        </soapenv:Body>
      </soapenv:Envelope>
    `;

    const response = await axios.post(`${baseUrl}/ProductService.wsdl`, xmlBody, {
      headers: {
        "Content-Type": "text/xml;charset=UTF-8",
        SOAPAction: "GetProductBySellerCodeRequest",
      },
    });

    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(response.data);

    const productData =
      result?.["soapenv:Envelope"]?.["soapenv:Body"]?.["ns3:GetProductBySellerCodeResponse"]?.product;

    return res.status(200).json({
      success: true,
      message: "Ürün başarıyla bulundu",
      product: productData || null,
    });
  } catch (error) {
    console.error("N11 ürün detay hatası:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "N11 ürün detay hatası",
      error: error.response?.data || error.message,
    });
  }
}
