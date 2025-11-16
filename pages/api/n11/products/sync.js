// 📁 /pages/api/n11/products/sync.js
import axios from "axios";
import xml2js from "xml2js";
import dbConnect from "@/lib/mongodb";
import N11Product from "@/models/N11Product";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Only GET allowed" });
  }

  await dbConnect();

  try {
    const { N11_APP_KEY, N11_APP_SECRET } = process.env;

    const xmlBody = `
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
              <pageSize>100</pageSize>
            </pagingData>
          </sch:GetProductListRequest>
        </soapenv:Body>
      </soapenv:Envelope>
    `;

    const { data } = await axios.post(
      "https://api.n11.com/ws/ProductService",
      xmlBody,
      { headers: { "Content-Type": "text/xml;charset=UTF-8" } }
    );

    if (!data) {
      return res.json({ success: false, message: "N11 Response empty" });
    }

    const parser = new xml2js.Parser({ explicitArray: false });

    try {
      const parsed = await parser.parseStringPromise(data);
      return res.json({
        success: true,
        debug: true,
        message: "Parsed SOAP Response. Partial Output:",
        keys: Object.keys(parsed),
        rawSample: data.substring(0, 1500)
      });
    } catch (parseError) {
      return res.json({
        success: false,
        message: "N11 Response parse edilemedi ❌",
        error: parseError.message,
        rawSample: data.substring(0, 2000)
      });
    }

  } catch (error) {
    return res.json({
      success: false,
      message: "N11 Sync Error ❌",
      error: error.message
    });
  }
}
