// 📁 /pages/api/n11/brands.js
import axios from "axios";
import xml2js from "xml2js";

export default async function handler(req, res) {
  try {
    const APP_KEY = process.env.N11_APP_KEY;
    const APP_SECRET = process.env.N11_APP_SECRET;

    const categoryId = req.query.id;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "Kategori ID gerekli",
      });
    }

    if (!APP_KEY || !APP_SECRET) {
      return res.status(500).json({
        success: false,
        message: "❌ N11 API bilgileri eksik.",
      });
    }

    // ✔ Kategori Attribute Request
    const xml = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
        xmlns:sch="http://www.n11.com/ws/schemas">
        <soapenv:Header/>
        <soapenv:Body>
          <sch:GetCategoryAttributesRequest>
            <auth>
              <appKey>${APP_KEY}</appKey>
              <appSecret>${APP_SECRET}</appSecret>
            </auth>
            <categoryId>${categoryId}</categoryId>
          </sch:GetCategoryAttributesRequest>
        </soapenv:Body>
      </soapenv:Envelope>
    `;

    const response = await axios.post(
      "https://api.n11.com/ws/ProductService.svc",
      xml,
      {
        headers: {
          "Content-Type": "text/xml;charset=UTF-8",
          SOAPAction: "http://www.n11.com/ws/GetCategoryAttributes",
        },
      }
    );

    // XML → JSON
    const parsed = await xml2js.parseStringPromise(response.data, {
      explicitArray: false,
    });

    const attributes =
      parsed?.["s:Envelope"]?.["s:Body"]?.GetCategoryAttributesResponse
        ?.categoryAttributes?.categoryAttribute || [];

    let attrArray = Array.isArray(attributes) ? attributes : [attributes];

    // Marka alanını buluyoruz
    const brandAttr = attrArray.find(
      (a) =>
        a.name?.toLowerCase() === "brand" ||
        a.name?.toLowerCase() === "marka"
    );

    if (!brandAttr) {
      return res.status(200).json({
        success: true,
        brands: [],
        message: "Bu kategoride marka attribute yok",
      });
    }

    const values =
      brandAttr?.valueList?.value || brandAttr?.valueList || [];

    const brands = Array.isArray(values) ? values : [values];

    return res.status(200).json({
      success: true,
      brands: brands.map((b) => ({
        id: b.id,
        name: b.name,
      })),
    });
  } catch (error) {
    console.error("❌ N11 kategori marka listesi hatası:", error);

    return res.status(500).json({
      success: false,
      message: "Kategori marka listesi alınamadı",
      error: error.message,
    });
  }
}
