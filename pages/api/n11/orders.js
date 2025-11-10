import axios from "axios";
import xml2js from "xml2js";

export default async function handler(req, res) {
  const url = "https://api.n11.com/ws/OrderService.wsdl";
  const { N11_API_KEY, N11_API_SECRET } = process.env;

  try {
    if (!N11_API_KEY || !N11_API_SECRET) {
      return res.status(400).json({
        success: false,
        message: "API anahtarları eksik",
      });
    }

    const xmlRequest = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                        xmlns:sch="http://www.n11.com/ws/schemas">
        <soapenv:Header/>
        <soapenv:Body>
          <sch:DetailedOrderListRequest>
            <auth>
              <appKey>${N11_API_KEY}</appKey>
              <appSecret>${N11_API_SECRET}</appSecret>
            </auth>
            <pagingData>
              <currentPage>0</currentPage>
              <pageSize>10</pageSize>
            </pagingData>
          </sch:DetailedOrderListRequest>
        </soapenv:Body>
      </soapenv:Envelope>
    `;

    const { data } = await axios.post(url, xmlRequest, {
      headers: { "Content-Type": "text/xml;charset=UTF-8" },
    });

    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(data);

    const body = result?.["soapenv:Envelope"]?.["soapenv:Body"];
    const response = body?.["ns3:DetailedOrderListResponse"] || body?.["DetailedOrderListResponse"];

    if (!response) {
      return res.status(400).json({
        success: false,
        message: "Beklenen yanıt bulunamadı",
        raw: data.slice(0, 400),
      });
    }

    const status = response.result?.status || "failure";
    const errorMsg = response.result?.errorMessage;

    if (status !== "success") {
      return res.status(403).json({
        success: false,
        message: "N11 sipariş çekme hatası",
        error: errorMsg || "Unknown error",
      });
    }

    const orders = response.orderList?.order || [];

    return res.status(200).json({
      success: true,
      message: "✅ Siparişler başarıyla çekildi",
      count: Array.isArray(orders) ? orders.length : 1,
      orders: Array.isArray(orders) ? orders : [orders],
    });
  } catch (err) {
    console.error("N11 API hata:", err.message);
    return res.status(500).json({
      success: false,
      message: "Sunucu hatası",
      error: err.message,
    });
  }
}
