// 📁 /pages/api/n11/brands.js
import axios from "axios";
import xml2js from "xml2js";

export default async function handler(req, res) {
  try {
    const APP_KEY = process.env.N11_APP_KEY;
    const APP_SECRET = process.env.N11_APP_SECRET;

    if (!APP_KEY || !APP_SECRET) {
      return res.status(500).json({
        success: false,
        message: "❌ N11 API bilgileri eksik.",
      });
    }

    // ✔ N11 dokümanına göre %100 doğru XML
    const xml = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
        xmlns:sch="http://www.n11.com/ws/schemas">
        <soapenv:Header/>
        <soapenv:Body>
          <sch:GetBrandListRequest>
            <auth>
              <appKey>${APP_KEY}</appKey>
              <appSecret>${APP_SECRET}</appSecret>
            </auth>
          </sch:GetBrandListRequest>
        </soapenv:Body>
      </soapenv:Envelope>
    `;

    // ✔ DOĞRU servis endpoint'i
    const url = "https://api.n11.com/ws/ProductService.svc";

    const response = await axios.post(url, xml, {
      headers: {
        "Content-Type": "text/xml;charset=UTF-8",
        SOAPAction: "http://www.n11.com/ws/GetBrandList",
      },
    });

    // XML → JSON parse
    const parsed = await xml2js.parseStringPromise(response.data, {
      explicitArray: false,
    });

    // ✔ N11'in SOAP dönüş yapısı
    const brandList =
      parsed["s:Envelope"]?.["s:Body"]?.GetBrandListResponse?.brandList?.brand ||
      [];

    const brands = Array.isArray(brandList) ? brandList : [brandList];

    return res.status(200).json({
      success: true,
      brands: brands.map((b) => ({
        id: b.id,
        name: b.name,
      })),
    });
  } catch (error) {
    console.error("❌ N11 marka listeleme hatası:", error.response?.data || error);

    return res.status(500).json({
      success: false,
      message: "N11 marka listesi alınamadı",
      error: error.message,
    });
  }
}
