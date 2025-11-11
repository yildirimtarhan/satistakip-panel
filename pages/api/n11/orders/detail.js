// 📁 /pages/api/n11/orders/detail.js
import axios from "axios";
import xml2js from "xml2js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Only GET allowed" });
  }

  const { orderNumber } = req.query;
  if (!orderNumber) {
    return res.status(400).json({ error: "orderNumber parametresi zorunludur" });
  }

  const { N11_APP_KEY, N11_APP_SECRET } = process.env;

  const xml = `<?xml version="1.0" encoding="utf-8"?>
  <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:sch="http://www.n11.com/ws/schemas">
    <soapenv:Header/>
    <soapenv:Body>
      <sch:OrderDetailRequest>
        <auth>
          <appKey>${N11_APP_KEY}</appKey>
          <appSecret>${N11_APP_SECRET}</appSecret>
        </auth>
        <orderNumber>${orderNumber}</orderNumber>
      </sch:OrderDetailRequest>
    </soapenv:Body>
  </soapenv:Envelope>`;

  try {
    const { data } = await axios.post("https://api.n11.com/ws/OrderService.wsdl", xml, {
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    });

    const parser = new xml2js.Parser({ explicitArray: false });
    const json = await parser.parseStringPromise(data);

    const orderDetail =
      json["soapenv:Envelope"]?.["soapenv:Body"]?.["ns3:OrderDetailResponse"]?.orderDetail;

    if (!orderDetail) {
      return res.status(404).json({ message: "Sipariş bulunamadı veya detay alınamadı" });
    }

    res.status(200).json({
      success: true,
      orderNumber,
      orderDetail,
    });
  } catch (err) {
    console.error("N11 OrderDetail Error:", err.message);
    res.status(500).json({ error: err.message });
  }
}
