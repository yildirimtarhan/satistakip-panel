import axios from "axios";
import xml2js from "xml2js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET destekleniyor" });
  }

  const { sellerProductCode } = req.query;

  if (!sellerProductCode) {
    return res.status(400).json({ message: "sellerProductCode eksik" });
  }

  const { N11_APP_KEY, N11_APP_SECRET } = process.env;

  const xml = `<?xml version="1.0" encoding="utf-8"?>
  <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:sch="http://www.n11.com/ws/schemas">
    <soapenv:Header/>
    <soapenv:Body>
      <sch:GetProductBySellerCodeRequest>
        <auth>
          <appKey>${N11_APP_KEY}</appKey>
          <appSecret>${N11_APP_SECRET}</appSecret>
        </auth>
        <sellerProductCode>${sellerProductCode}</sellerProductCode>
      </sch:GetProductBySellerCodeRequest>
    </soapenv:Body>
  </soapenv:Envelope>`;

  try {
    const { data } = await axios.post(
      "https://api.n11.com/ws/ProductService.wsdl",
      xml,
      { headers: { "Content-Type": "text/xml; charset=utf-8" } }
    );

    const parser = new xml2js.Parser({ explicitArray: false });
    const json = await parser.parseStringPromise(data);

    const product =
      json["soapenv:Envelope"]?.["soapenv:Body"]?.["ns3:GetProductBySellerCodeResponse"]?.product;

    if (!product) {
      return res.status(404).json({ message: "Ürün bulunamadı" });
    }

    res.status(200).json({
      success: true,
      sellerProductCode,
      product,
    });
  } catch (err) {
    console.error("N11 ürün detay hatası:", err.message);
    return res.status(500).json({ message: "N11 ürün detay hatası", error: err.message });
  }
}
