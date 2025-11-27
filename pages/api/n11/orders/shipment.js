// /pages/api/n11/orders/shipment.js
import axios from "axios";
import jwt from "jsonwebtoken";
import xml2js from "xml2js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Token gerekli" });

    jwt.verify(token, process.env.JWT_SECRET);

    const { orderItemId, trackingNumber, trackingUrl, shipmentCompany } = req.body;

    const xmlRequest = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://www.n11.com/ws/schemas">
        <soapenv:Header/>
        <soapenv:Body>
          <sch:OrderItemShipmentRequest>
            <auth>
              <appKey>${process.env.N11_API_KEY}</appKey>
              <appSecret>${process.env.N11_API_SECRET}</appSecret>
            </auth>
            <orderItemId>${orderItemId}</orderItemId>
            <shipmentInfo>
              <trackingNumber>${trackingNumber}</trackingNumber>
              <trackingUrl>${trackingUrl}</trackingUrl>
              <shipmentCompany>${shipmentCompany}</shipmentCompany>
            </shipmentInfo>
          </sch:OrderItemShipmentRequest>
        </soapenv:Body>
      </soapenv:Envelope>
    `;

    const response = await axios.post(
      process.env.N11_BASE_URL,
      xmlRequest,
      { headers: { "Content-Type": "text/xml" } }
    );

    const result = await xml2js.parseStringPromise(response.data);

    return res.status(200).json({ success: true, result });

  } catch (err) {
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
