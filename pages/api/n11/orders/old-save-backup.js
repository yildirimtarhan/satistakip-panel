// 📁 /pages/api/n11/orders/save.js
import axios from "axios";
import xml2js from "xml2js";

export default async function handler(req, res) {
  try {
    const { N11_API_KEY, N11_API_SECRET, N11_BASE_URL } = process.env;

    if (!N11_API_KEY || !N11_API_SECRET || !N11_BASE_URL) {
      return res.status(500).json({
        success: false,
        message: "❌ N11 environment değişkenleri eksik.",
      });
    }

    // 🧩 DÜZELTİLMİŞ SOAP İSTEĞİ
    const xmlRequest = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://www.n11.com/ws/schemas">
        <soapenv:Header/>
        <soapenv:Body>
          <sch:GetOrderListRequest>
            <auth>
              <appKey>${N11_API_KEY}</appKey>
              <appSecret>${N11_API_SECRET}</appSecret>
            </auth>
            <pagingData>
              <currentPage>0</currentPage>
              <pageSize>5</pageSize>
            </pagingData>
          </sch:GetOrderListRequest>
        </soapenv:Body>
      </soapenv:Envelope>
    `;

    // 🌐 DOĞRU ENDPOINT — “OrderService” (WSDL’siz)
    const response = await axios.post(`${N11_BASE_URL}/OrderService`, xmlRequest, {
      headers: { "Content-Type": "text/xml;charset=UTF-8" },
    });

    // 🧠 XML yanıtını JSON’a çevir
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(response.data);

    const body = result["soapenv:Envelope"]["soapenv:Body"];
    const orders = body?.["ns3:getOrderListResponse"]?.orderList?.order || [];

    if (!orders.length) {
      return res.status(200).json({
        success: true,
        message: "✅ N11 API erişimi başarılı, ancak sipariş bulunamadı.",
        data: [],
      });
    }

    return res.status(200).json({
      success: true,
      message: "✅ Siparişler başarıyla çekildi!",
      data: orders,
    });
  } catch (error) {
    console.error("❌ N11 API hatası:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "N11 sipariş çekme hatası",
      error: error.response?.data || error.message,
    });
  }
}
