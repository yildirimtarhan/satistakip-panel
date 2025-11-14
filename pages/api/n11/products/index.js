// 📁 /pages/api/n11/products/index.js

import axios from "axios";
import xml2js from "xml2js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET destekleniyor" });
  }

  const appKey = process.env.N11_APP_KEY;
  const appSecret = process.env.N11_APP_SECRET;

  if (!appKey || !appSecret) {
    return res.status(400).json({
      success: false,
      message: "API kimlik bilgileri eksik (.env dosyasını kontrol et)",
    });
  }

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
            <pageSize>20</pageSize>
          </pagingData>
        </sch:GetProductListRequest>
      </soapenv:Body>
    </soapenv:Envelope>
  `;

  try {
    const response = await axios.post(
      "https://api.n11.com/ws/ProductService.wsdl",
      xmlBody,
      {
        headers: {
          "Content-Type": "text/xml;charset=UTF-8",
          SOAPAction: "GetProductList",
        },
        timeout: 15000,
      }
    );

    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(response.data);

    const products =
      result["soapenv:Envelope"]?.["soapenv:Body"]?.["ns3:GetProductListResponse"]?.products?.product || [];

    return res.status(200).json({
      success: true,
      count: Array.isArray(products) ? products.length : products ? 1 : 0,
      products: Array.isArray(products) ? products : products ? [products] : [],
    });

  } catch (err) {
    console.error("N11 ürün listesi hata:", err.message);
    return res.status(500).json({
      success: false,
      message: "N11 ürün listesi hatası",
      error: err.message,
    });
  }
}
