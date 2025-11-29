// 📁 /pages/api/n11/products/update.js
import axios from "axios";
import xml2js from "xml2js";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";

const N11_URL = "https://api.n11.com/ws/ProductService.svc";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Only POST allowed" });
  }

  try {
    await dbConnect();

    // 1) Token kontrolü
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
    if (!token) return res.status(401).json({ success: false, message: "Token gerekli." });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: "Token hatalı." });
    }

    // 2) Ürün ID al
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, message: "productId gerekli" });
    }

    // 3) Ürünü DB’den çek
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Ürün bulunamadı" });
    }

    const n11 = product.marketplaceSettings.n11;

    // 4) XML Güncelleme isteği
    const xml = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
      xmlns:sch="http://www.n11.com/ws/schemas">
      <soapenv:Header/>
      <soapenv:Body>
        <sch:SaveProductRequest>
          <auth>
            <appKey>${process.env.N11_APP_KEY}</appKey>
            <appSecret>${process.env.N11_APP_SECRET}</appSecret>
          </auth>

          <product>
            <id>${product.marketplaces.n11.productId}</id>
            <title><![CDATA[${product.name}]]></title>
            <description><![CDATA[${product.description}]]></description>

            <category>
              <id>${n11.categoryId}</id>
            </category>

            <brandId>${n11.brandId}</brandId>
            <model>${product.modelCode}</model>

            <price>${product.priceTl}</price>
            <currencyType>1</currencyType>

            <prepareDays>${n11.preparingDay}</prepareDays>

            <productImages>
              ${product.images
                .map(
                  (img, i) => `
                <productImage>
                  <url>${img}</url>
                  <order>${i + 1}</order>
                </productImage>
              `
                )
                .join("")}
            </productImages>

            <stockItems>
              ${
                product.variants?.length > 0
                  ? product.variants
                      .map(
                        (v, index) => `
                  <stockItem>
                    <quantity>${v.stock}</quantity>
                    <stockCode>${v.sku}</stockCode>
                    <optionPrice>${v.priceTl || product.priceTl}</optionPrice>
                  </stockItem>
                `
                      )
                      .join("")
                  : `
                <stockItem>
                  <quantity>${product.stock}</quantity>
                  <stockCode>${product.sku}</stockCode>
                </stockItem>
              `
              }
            </stockItems>
          </product>

          <attributes>
            ${Object.entries(n11.attributes || {})
              .map(
                ([id, val]) => `
              <attribute>
                <id>${id}</id>
                <value><![CDATA[${val}]]></value>
              </attribute>
            `
              )
              .join("")}
          </attributes>
        </sch:SaveProductRequest>
      </soapenv:Body>
    </soapenv:Envelope>
    `;

    // 5) SOAP çağrısı yap
    const response = await axios.post(N11_URL, xml, {
      headers: { "Content-Type": "text/xml;charset=UTF-8" },
    });

    // 6) SOAP cevabı parse et
    const parsed = await xml2js.parseStringPromise(response.data, { explicitArray: false });

    const result =
      parsed["s:Envelope"]["s:Body"]["SaveProductResponse"]["SaveProductResult"];

    const status = result.status?.status;
    const message = result.status?.message;

    if (status !== "success") {
      return res.status(400).json({
        success: false,
        message: "N11 güncelleme hatası",
        detail: message,
      });
    }

    // 7) DB güncelle
    product.marketplaces.n11.status = "Updated";
    product.marketplaces.n11.updatedAt = new Date();
    await product.save();

    return res.json({
      success: true,
      message: "Ürün N11 üzerinde güncellendi",
      result: message,
    });
  } catch (err) {
    console.error("N11 Update Error:", err);
    return res.status(500).json({
      success: false,
      message: "N11 servis hatası",
      error: err.message,
    });
  }
}
