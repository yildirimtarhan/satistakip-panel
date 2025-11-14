// 📁 /pages/api/n11/test.js
import axios from "axios";

export default async function handler(req, res) {
  try {
    const { N11_APP_KEY, N11_APP_SECRET } = process.env;

    const xml = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
        xmlns:sch="http://www.n11.com/ws/schemas">
        <soapenv:Header/>
        <soapenv:Body>
          <sch:GetProductListRequest>
            <auth>
              <appKey>${N11_APP_KEY}</appKey>
              <appSecret>${N11_APP_SECRET}</appSecret>
            </auth>
            <pagingData>
              <currentPage>0</currentPage>
              <pageSize>1</pageSize>
            </pagingData>
          </sch:GetProductListRequest>
        </soapenv:Body>
      </soapenv:Envelope>
    `;

    // ‼️ DÜZELTİLMİŞ URL
    const url = "https://api.n11.com/ws/ProductService";

    const response = await axios.post(url, xml, {
      headers: {
        "Content-Type": "text/xml;charset=UTF-8",
        SOAPAction: "GetProductListRequest",
      },
      timeout: 20000,
    });

    return res.status(200).json({
      success: true,
      message: "Bağlantı OK",
      raw: response.data,
    });
  } catch (err) {
    console.error("N11 test hatası:", err.message);
    return res.status(500).json({
      success: false,
      message: "Bağlantı hatası",
      error: err.message,
    });
  }
}
