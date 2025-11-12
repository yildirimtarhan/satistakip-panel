// ✅ /pages/api/n11/products/index.js
import axios from "axios";
import xml2js from "xml2js";

export default async function handler(req, res) {
  try {
    const appKey = process.env.N11_API_KEY;
    const appSecret = process.env.N11_API_SECRET;
    const baseUrl = process.env.N11_BASE_URL || "https://api.n11.com/ws";

    if (!appKey || !appSecret) {
      return res.status(400).json({
        success: false,
        message: "API kimlik bilgileri eksik (.env dosyasını kontrol et)",
      });
    }

    // 🧱 XML gövdesi (dokümandaki birebir SOAP format)
    const xmlBody = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                        xmlns:sch="http://www.n11.com/ws/schemas">
        <soapenv:Header/>
        <soapenv:Body>
          <sch:GetProductListRequest>
            <auth>
              <appKey>${appKey}</appKey>
              <appSecret>${appSecret}</appSecret>
            </auth>
            <pagingData>
              <currentPage>0</currentPage>
              <pageSize>5</pageSize>
            </pagingData>
          </sch:GetProductListRequest>
        </soapenv:Body>
      </soapenv:Envelope>
    `;

    // 🛰️ SOAP isteği
    const response = await axios.post(`${baseUrl}/ProductService.wsdl`, xmlBody, {
      headers: {
        "Content-Type": "text/xml;charset=UTF-8",
        SOAPAction: "GetProductListRequest",
      },
      timeout: 15000,
    });

    // 🧩 XML'i JSON'a çevir
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(response.data);

    const productList =
      result?.["soapenv:Envelope"]?.["soapenv:Body"]?.["ns3:GetProductListResponse"]?.products?.product || [];

    return res.status(200).json({
      success: true,
      message: "✅ Ürün listesi başarıyla çekildi.",
      products: productList,
    });
  } catch (error) {
    console.error("❌ N11 ürün çekme hatası:", error.response?.statusText || error.message);
    return res.status(500).json({
      success: false,
      message: "N11 ürün çekme hatası",
      error: error.response?.data || error.message,
    });
  }
}
