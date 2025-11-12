// 📁 /pages/api/n11/products/add.js
import axios from "axios";
import xml2js from "xml2js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST istekleri destekleniyor." });
  }

  const { N11_APP_KEY, N11_APP_SECRET } = process.env;

  // 🧾 Ürün verisi body'den alınır
  const {
    productSellerCode,
    title,
    description,
    price,
    stock,
    currency = "TRY",
    categoryId,
    shipmentTemplate,
    preparingDay = 3,
  } = req.body;

  if (!productSellerCode || !title || !price || !stock || !categoryId) {
    return res.status(400).json({
      message:
        "Eksik parametre. Gerekli alanlar: productSellerCode, title, price, stock, categoryId",
    });
  }

  // 🧩 SOAP XML formatı
  const xml = `<?xml version="1.0" encoding="utf-8"?>
  <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:sch="http://www.n11.com/ws/schemas">
    <soapenv:Header/>
    <soapenv:Body>
      <sch:SaveProductRequest>
        <auth>
          <appKey>${N11_APP_KEY}</appKey>
          <appSecret>${N11_APP_SECRET}</appSecret>
        </auth>
        <product>
          <productSellerCode>${productSellerCode}</productSellerCode>
          <title>${title}</title>
          <description><![CDATA[${description || "ERP Ürün Tanımı"}]]></description>
          <category>
            <id>${categoryId}</id>
          </category>
          <price>${price}</price>
          <currencyType>${currency}</currencyType>
          <stockItems>
            <stockItem>
              <optionPrice>${price}</optionPrice>
              <quantity>${stock}</quantity>
              <sellerStockCode>${productSellerCode}</sellerStockCode>
              <shipmentTemplate>${shipmentTemplate || "Standart"}</shipmentTemplate>
              <preparingDay>${preparingDay}</preparingDay>
            </stockItem>
          </stockItems>
        </product>
      </sch:SaveProductRequest>
    </soapenv:Body>
  </soapenv:Envelope>`;

  try {
    // 🔗 N11 SaveProduct servisine gönder
    const { data } = await axios.post("https://api.n11.com/ws/ProductService.wsdl", xml, {
      headers: { "Content-Type": "text/xml; charset=utf-8" },
      timeout: 20000,
    });

    const parser = new xml2js.Parser({ explicitArray: false });
    const json = await parser.parseStringPromise(data);

    const result =
      json["soapenv:Envelope"]?.["soapenv:Body"]?.["ns3:SaveProductResponse"]?.result;

    res.status(200).json({
      success: true,
      message: "Ürün gönderimi tamamlandı.",
      result: result || "Boş yanıt",
    });
  } catch (error) {
    console.error("N11 SaveProduct Error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}
