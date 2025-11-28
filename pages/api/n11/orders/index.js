import axios from "axios";
import xml2js from "xml2js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET destekleniyor" });
  }

  try {
    const APP_KEY = process.env.N11_APP_KEY;
    const APP_SECRET = process.env.N11_APP_SECRET;

    const xml = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
      xmlns:sch="http://www.n11.com/ws/schemas">
      <soapenv:Header/>
      <soapenv:Body>
        <sch:GetOrderListRequest>
          <auth>
            <appKey>${APP_KEY}</appKey>
            <appSecret>${APP_SECRET}</appSecret>
          </auth>
          <pagingData>
            <currentPage>0</currentPage>
            <pageSize>50</pageSize>
          </pagingData>
        </sch:GetOrderListRequest>
      </soapenv:Body>
    </soapenv:Envelope>`;

    // 🚀 Mutlaka WSDL değil, gerçek endpoint
    const response = await axios.post(
      "https://api.n11.com/ws/OrderService",
      xml,
      { headers: { "Content-Type": "text/xml;charset=UTF-8" } }
    );

    const parser = new xml2js.Parser({ explicitArray: false });
    const parsed = await parser.parseStringPromise(response.data);

    // 🧠 Namespace esnek yakalama
    const body =
      parsed?.["soapenv:Envelope"]?.["soapenv:Body"] ||
      parsed?.Envelope?.Body ||
      parsed?.Body;

    const orderResponse =
      body?.["ns3:GetOrderListResponse"] ||
      body?.["sch:GetOrderListResponse"] ||
      body?.GetOrderListResponse ||
      null;

    if (!orderResponse) {
      return res.status(200).json({
        success: true,
        orders: [],
        message: "Hiç sipariş bulunamadı"
      });
    }

    const orders =
      orderResponse?.orderList?.order ||
      orderResponse?.orders?.order ||
      [];

    const arrayOrders = Array.isArray(orders) ? orders : [orders];

    return res.status(200).json({
      success: true,
      count: arrayOrders.length,
      orders: arrayOrders
    });

  } catch (err) {
    console.error("N11 Order Error:", err.response?.data || err);
    return res.status(500).json({
      success: false,
      message: "N11 servis hatası",
      error: err.response?.data || err.message,
    });
  }
}
