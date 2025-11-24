// 📁 /pages/api/n11/products/saveProduct.js
import axios from "axios";
import xml2js from "xml2js";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import N11Product from "@/models/N11Product";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ message: "Only POST allowed" });

  // 1) TOKEN DOĞRULAMA
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: "Token eksik" });

  const token = auth.split(" ")[1];
  let user = null;
  try {
    user = jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) {
    return res.status(401).json({ message: "Geçersiz token" });
  }

  const { productId } = req.body;
  if (!productId)
    return res.status(400).json({ message: "productId zorunlu" });

  await dbConnect();

  // 2) ERP ÜRÜNÜ GETİR
  const p = await Product.findById(productId);
  if (!p) {
    return res.status(404).json({ message: "Ürün bulunamadı" });
  }

  const { N11_APP_KEY, N11_APP_SECRET } = process.env;

  // 3) N11 AddProduct XML oluşturma
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
          <title>${p.ad}</title>
          <subtitle></subtitle>
          <description>${p.aciklama || p.ad}</description>
          <category>
            <id>${p.n11CategoryId || ""}</id>
          </category>

          <price>${p.satisFiyati}</price>
          <currencyType>TL</currencyType>
          <approvalStatus>APPROVED</approvalStatus>

          <productSellerCode>${p.sku || p._id}</productSellerCode>

          <stockItems>
            <stockItem>
              <quantity>${p.stok}</quantity>
              <n11CatalogId></n11CatalogId>
              <bundle>false</bundle>
              <sellerStockCode>${p.sku || p._id}</sellerStockCode>
            </stockItem>
          </stockItems>

          ${p.resimUrl ? `
          <images>
            <image>
              <url>${p.resimUrl}</url>
            </image>
          </images>` : ""}
        </product>

      </sch:SaveProductRequest>
    </soapenv:Body>
  </soapenv:Envelope>`;

  try {
    // 4) N11 SOAP isteği
    const { data } = await axios.post(
      "https://api.n11.com/ws/ProductService",
      xml,
      {
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
        },
      }
    );

    // 5) XML → JSON
    const parser = new xml2js.Parser({ explicitArray: false });
    const json = await parser.parseStringPromise(data);

    const resp =
      json["soapenv:Envelope"]?.["soapenv:Body"]?.[
        "ns3:SaveProductResponse"
      ]?.product;

    if (!resp) {
      return res.status(500).json({
        success: false,
        message: "N11 yanıtı alınamadı",
        raw: json,
      });
    }

    const n11ProductId = resp.id;
    const stockItemId =
      resp.stockItems?.stockItem?.id || null;

    // 6) MongoDB’ye kaydet
    await N11Product.create({
      erpProductId: p._id,
      n11ProductId,
      stockItemId,
      title: p.ad,
      price: p.satisFiyati,
      stock: p.stok,
      sku: p.sku,
    });

    // 7) ERP ürününe işaret ekle
    p.n11ProductId = n11ProductId;
    await p.save();

    return res.status(200).json({
      success: true,
      message: "Ürün N11'e başarıyla gönderildi",
      n11ProductId,
      stockItemId,
    });
  } catch (err) {
    console.error("N11 AddProduct Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "N11 ürün gönderim hatası",
      error: err.message,
    });
  }
}
