// 📁 /pages/api/n11/orders/shipment.js
import axios from "axios";
import xml2js from "xml2js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Only POST allowed" });
  }

  try {
    const { orderNumber, shipmentCompany, trackingNumber } = req.body;

    if (!orderNumber || !shipmentCompany || !trackingNumber) {
      return res.status(400).json({
        success: false,
        message: "Eksik alan: orderNumber, shipmentCompany, trackingNumber"
      });
    }

    const { N11_APP_KEY, N11_APP_SECRET } = process.env;

    if (!N11_APP_KEY || !N11_APP_SECRET) {
      return res.status(500).json({
        success: false,
        message: "N11 APP KEY veya SECRET eksik (Render ayarlarını kontrol et)"
      });
    }

    // 📦 KARGO BİLDİRİMİ (MakeOrderItemShipmentRequest)
    const xml = `<?xml version="1.0" encoding="utf-8"?>
    <soapenv:Envelope 
      xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
      xmlns:sch="http://www.n11.com/ws/schemas">
      <soapenv:Header/>
      <soapenv:Body>
        <sch:MakeOrderItemShipmentRequest>
          <auth>
            <appKey>${N11_APP_KEY}</appKey>
            <appSecret>${N11_APP_SECRET}</appSecret>
          </auth>
          <shipmentList>
            <shipment>
              <orderNumber>${orderNumber}</orderNumber>
              <shipmentCompany>${shipmentCompany}</shipmentCompany>
              <trackingNumber>${trackingNumber}</trackingNumber>
            </shipment>
          </shipmentList>
        </sch:MakeOrderItemShipmentRequest>
      </soapenv:Body>
    </soapenv:Envelope>`;

    // 🛰️ API’ye gönder
    const { data } = await axios.post(
      "https://api.n11.com/ws/OrderService",
      xml,
      {
        headers: {
          "Content-Type": "text/xml;charset=UTF-8"
        },
        timeout: 20000
      }
    );

    // 🧩 XML -> JSON
    const parser = new xml2js.Parser({ explicitArray: false });
    const json = await parser.parseStringPromise(data);

    // Namespace’lerin farklı versiyonlarını yakala
    const envelope =
      json["SOAP-ENV:Envelope"] ||
      json["soapenv:Envelope"] ||
      json["Envelope"];

    const body =
      envelope?.["SOAP-ENV:Body"] ||
      envelope?.["soapenv:Body"] ||
      envelope?.Body;

    const response =
      body?.["ns3:MakeOrderItemShipmentResponse"] ||
      body?.["ns2:MakeOrderItemShipmentResponse"] ||
      body?.["ns1:MakeOrderItemShipmentResponse"] ||
      body?.MakeOrderItemShipmentResponse;

    if (!response) {
      return res.status(200).json({
        success: false,
        message: "N11 boş veya hatalı yanıt döndürdü",
        raw: json
      });
    }

    return res.status(200).json({
      success: true,
      message: "Kargo bildirimi başarıyla gönderildi!",
      n11Response: response
    });
  } catch (err) {
    console.error("❌ KARGO BİLDİRİMİ HATASI:", err.message);
    return res.status(500).json({
      success: false,
      message: "Kargo bildirimi gönderilemedi",
      error: err.message
    });
  }
}
