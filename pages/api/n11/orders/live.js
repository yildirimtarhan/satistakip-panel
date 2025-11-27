// /pages/api/n11/orders/live.js
import axios from "axios";
import xml2js from "xml2js";
import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Token gerekli" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const xmlRequest = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://www.n11.com/ws/schemas">
        <soapenv:Header/>
        <soapenv:Body>
          <sch:GetOrderListRequest>
            <auth>
              <appKey>${process.env.N11_API_KEY}</appKey>
              <appSecret>${process.env.N11_API_SECRET}</appSecret>
            </auth>
            <status>1</status>
            <pagingData>
              <currentPage>0</currentPage>
              <pageSize>50</pageSize>
            </pagingData>
          </sch:GetOrderListRequest>
        </soapenv:Body>
      </soapenv:Envelope>
    `;

    const response = await axios.post(
      process.env.N11_BASE_URL,
      xmlRequest,
      { headers: { "Content-Type": "text/xml" } }
    );

    const json = await xml2js.parseStringPromise(response.data, {
      explicitArray: false,
      ignoreAttrs: true,
    });

    return res.status(200).json(json);

  } catch (err) {
    console.log("🔥 Live orders error:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
