import axios from "axios";
import xml2js from "xml2js";

const N11_URL = "https://api.n11.com/ws/OrderService.wsdl";

const buildSOAPBody = (appKey, appSecret) => `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:sch="http://www.n11.com/ws/schemas">
  <soapenv:Header/>
  <soapenv:Body>
    <sch:DetailedOrderListRequest>
      <auth>
        <appKey>${appKey}</appKey>
        <appSecret>${appSecret}</appSecret>
      </auth>
      <pagingData>
        <currentPage>0</currentPage>
        <pageSize>10</pageSize>
      </pagingData>
    </sch:DetailedOrderListRequest>
  </soapenv:Body>
</soapenv:Envelope>`;

export default async function handler(req, res) {
  try {
    const appKey = process.env.N11_API_KEY;
    const appSecret = process.env.N11_API_SECRET;

    if (!appKey || !appSecret) {
      return res.status(400).json({ success: false, message: "N11 API anahtarları eksik" });
    }

    const xmlBody = buildSOAPBody(appKey, appSecret);

    const { data: xmlData } = await axios.post(N11_URL, xmlBody, {
      headers: { "Content-Type": "text/xml;charset=utf-8" },
      timeout: 20000,
    });

    const parser = new xml2js.Parser({ explicitArray: false });
    const parsed = await parser.parseStringPromise(xmlData);

    const body =
      parsed?.["soapenv:Envelope"]?.["soapenv:Body"] ||
      parsed?.Envelope?.Body ||
      {};
    const response =
      body["ns3:DetailedOrderListResponse"] ||
      body["sch:DetailedOrderListResponse"] ||
      body["DetailedOrderListResponse"] ||
      null;

    const fault = body?.Fault;
    if (fault) {
      return res.status(502).json({
        success: false,
        message: "SOAP Fault",
        detail: fault.faultstring,
      });
    }

    if (!response) {
      return res.status(404).json({
        success: false,
        message: "Beklenen yanıt bulunamadı",
        raw: xmlData?.slice(0, 500),
      });
    }

    const orders = response.orderList?.order || [];
    return res.status(200).json({
      success: true,
      count: Array.isArray(orders) ? orders.length : 1,
      orders: Array.isArray(orders) ? orders : [orders],
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "N11 sipariş çekme hatası",
      error: err.message,
    });
  }
}
