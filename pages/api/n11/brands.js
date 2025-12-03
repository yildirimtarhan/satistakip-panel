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

    // ✔ DOĞRU SOAP XML
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
            <pagingData>
              <currentPage>0</currentPage>
              <pageSize>1000</pageSize>
            </pagingData>
          </sch:GetBrandListRequest>
        </soapenv:Body>
      </soapenv:Envelope>
    `;

    const response = await axios.post(
      "https://api.n11.com/ws/ProductService.svc",
      xml,
      {
        headers: {
          "Content-Type": "text/xml;charset=UTF-8",
          SOAPAction: "http://www.n11.com/ws/GetBrandList",
        },
        timeout: 20000,
      }
    );

    // ✔ XML → JSON
    const parsed = await xml2js.parseStringPromise(response.data, {
      explicitArray: false,
    });

    const rawList =
      parsed["s:Envelope"]?.["s:Body"]?.GetBrandListResponse?.brandList?.brand;

    if (!rawList) {
      return res.status(200).json({ success: true, brands: [] });
    }

    const brands = Array.isArray(rawList) ? rawList : [rawList];

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
      error: error.response?.statusText || error.message,
    });
  }
}
