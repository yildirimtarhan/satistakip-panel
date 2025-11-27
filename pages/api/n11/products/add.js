// 📁 /pages/api/n11/products/add.js
import axios from "axios";
import xml2js from "xml2js";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import N11Product from "@/models/N11Product";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ success: false, message: "Only POST allowed" });

  // token
  const auth = req.headers.authorization;
  if (!auth)
    return res.status(401).json({ success: false, message: "Token eksik" });

  let user;
  try {
    user = jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ success: false, message: "Geçersiz token" });
  }

  const { productId } = req.body;
  if (!productId)
    return res.status(400).json({ success: false, message: "productId zorunlu" });

  await dbConnect();

  // ürün al
  const p = await Product.findById(productId);
  if (!p)
    return res.status(404).json({ success: false, message: "Ürün bulunamadı" });

  if (!p.n11CategoryId) {
    return res.status(400).json({
      success: false,
      message: "N11 kategori seçilmemiş",
    });
  }

  const { N11_APP_KEY, N11_APP_SECRET } = process.env;
  if (!N11_APP_KEY || !N11_APP_SECRET)
    return res.status(500).json({
      success: false,
      message: "N11 APP KEY / SECRET tanımlı değil",
    });

  const barkod = p.barkod || p.sku || p._id.toString();
  const aciklama = p.aciklama || p.ad;

  // XML body
  const xml = `
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
          <productSellerCode>${barkod}</productSellerCode>
          <title>${p.ad.replace(/&/g, "&amp;")}</title>
          <description><![CDATA[${aciklama}]]></description>

          <category id="${p.n11CategoryId}"></category>

          <price>${String(p.satisFiyati).replace(",", ".")}</price>
          <currencyType>${p.paraBirimi}</currencyType>

          <stockItems>
            <stockItem>
              <quantity>${p.stok}</quantity>
              <sellerStockCode>${barkod}</sellerStockCode>
            </stockItem>
          </stockItems>

          ${
            p.resimUrl
              ? `
          <images>
            <image><url>${p.resimUrl}</url></image>
          </images>`
              : ""
          }
        </product>

      </sch:SaveProductRequest>
    </soapenv:Body>
  </soapenv:Envelope>`.trim();

  try {
    const { data } = await axios.post(
      "https://api.n11.com/ws/ProductService",
      xml,
      {
        headers: {
          "Content-Type": "text/xml;charset=UTF-8",
          SOAPAction:
            "http://www.n11.com/ws/schemas/ProductServicePort/SaveProduct",
        },
        timeout: 20000,
      }
    );

    const parser = new xml2js.Parser({ explicitArray: false });
    const json = await parser.parseStringPromise(data);

    const body =
      json["soapenv:Envelope"]?.["soapenv:Body"] ||
      json["SOAP-ENV:Envelope"]?.["SOAP-ENV:Body"];

    const resp =
      body?.["ns3:SaveProductResponse"] ||
      body?.SaveProductResponse ||
      body?.["sch:SaveProductResponse"];

    if (!resp) {
      return res.status(500).json({
        success: false,
        message: "N11 response okunamadı",
        raw: json,
      });
    }

    const result = resp.result;

    if ((result.status || "").toLowerCase() !== "success") {
      return res.status(400).json({
        success: false,
        message: result.errorMessage || "N11 ürün kaydı başarısız",
        code: result.errorCode,
      });
    }

    const productData = resp.product;

    await N11Product.findOneAndUpdate(
      { erpProductId: p._id },
      {
        erpProductId: p._id,
        n11ProductId: productData.id,
        raw: productData,
      },
      { upsert: true }
    );

    p.n11ProductId = productData.id;
    await p.save();

    return res.status(200).json({
      success: true,
      message: "Ürün N11'e gönderildi",
      n11ProductId: productData.id,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "N11 gönderim hatası",
      error: err.response?.data || err.message,
    });
  }
}
