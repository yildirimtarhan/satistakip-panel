// 📁 /pages/api/n11/brands.js
import axios from "axios";
import xml2js from "xml2js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ success: false, message: "Only GET method is allowed" });
  }

  try {
    const APP_KEY = process.env.N11_APP_KEY;
    const APP_SECRET = process.env.N11_APP_SECRET;

    if (!APP_KEY || !APP_SECRET) {
      return res.status(500).json({
        success: false,
        message: "❌ N11 APP_KEY veya APP_SECRET tanımlı değil.",
      });
    }

    // 🔹 N11 GetBrandListRequest – pagingData ile
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
              <pageSize>500</pageSize>
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
        timeout: 30000,
      }
    );

    // 🔹 XML → JS
    const parsed = await xml2js.parseStringPromise(response.data, {
      explicitArray: false,
    });

    // N11’in tipik response yapısı şu yönde:
    // Envelope → Body → GetBrandListResponse → result → status / errorMessage
    // brandList → brand
    const body =
      parsed["s:Envelope"]?.["s:Body"] ||
      parsed["soap:Envelope"]?.["soap:Body"] ||
      parsed["Envelope"]?.["Body"];

    const resp =
      body?.GetBrandListResponse || body?.getBrandListResponse || body;

    const result = resp?.result;
    const status = result?.status || result?.Status;

    if (status && status !== "SUCCESS") {
      const errMsg =
        result?.errorMessage || result?.ErrorMessage || "N11 hata döndürdü";
      console.error("❌ N11 GetBrandList status ERROR:", errMsg);
      return res.status(500).json({
        success: false,
        message: "N11 marka listesi alınamadı",
        error: errMsg,
      });
    }

    const brandListNode = resp?.brandList?.brand || resp?.brandList || [];
    const brandsArray = Array.isArray(brandListNode)
      ? brandListNode
      : brandListNode
      ? [brandListNode]
      : [];

    const brands = brandsArray.map((b) => ({
      id: b.id || b.brandId || "",
      name: b.name || "",
    }));

    return res.status(200).json({
      success: true,
      brands,
      count: brands.length,
    });
  } catch (error) {
    console.error(
      "❌ N11 marka listeleme hatası (backend):",
      error.response?.data || error.message || error
    );

    return res.status(500).json({
      success: false,
      message: "N11 marka listesi alınamadı",
      error: error.message || "Unknown error",
    });
  }
}
