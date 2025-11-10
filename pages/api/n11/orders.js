// 📁 /pages/api/n11/orders.js
import xml2js from "xml2js";

export default async function handler(req, res) {
  const { N11_APP_KEY, N11_APP_SECRET } = process.env;

  const url = "https://api.n11.com/ws/OrderService.wsdl";

  const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
  <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://www.n11.com/ws/schemas">
    <soapenv:Header/>
    <soapenv:Body>
      <sch:GetOrderListRequest>
        <auth>
          <appKey>${N11_APP_KEY}</appKey>
          <appSecret>${N11_APP_SECRET}</appSecret>
        </auth>
        <pagingData>
          <currentPage>0</currentPage>
          <pageSize>10</pageSize>
        </pagingData>
      </sch:GetOrderListRequest>
    </soapenv:Body>
  </soapenv:Envelope>`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: "http://www.n11.com/ws/GetOrderList",
      },
      body: xmlBody.trim(),
    });

    const xml = await response.text();
    console.log("🧩 Raw XML Response:", xml);

    const result = await xml2js.parseStringPromise(xml, { explicitArray: false });

    res.status(200).json({
      success: true,
      message: "✅ N11 siparişleri başarıyla alındı.",
      data: result,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "❌ N11 sipariş listesi alınamadı.",
      error: err.message,
    });
  }
}
