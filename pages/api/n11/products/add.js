// 📁 /pages/api/n11/products/add.js
import axios from "axios";
import xml2js from "xml2js";
import clientPromise from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ message: "Sadece POST destekleniyor" });

  try {
    // --- 1) Token Doğrulama ---
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ message: "Token eksik" });

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // --- 2) MongoDB Bağlantısı ---
    const client = await clientPromise;
    const db = client.db("satistakip");
    const products = db.collection("products");

    const { productId } = req.body;
    if (!productId)
      return res.status(400).json({ message: "productId zorunlu" });

    // --- 3) ERP Ürünü Çek ---
    const product = await products.findOne({
      _id: new ObjectId(productId),
      userId: decoded.userId,
    });

    if (!product)
      return res.status(404).json({ message: "Ürün bulunamadı" });

    // --- 4) N11 API değerleri ---
    const APP_KEY = process.env.N11_APP_KEY;
    const APP_SECRET = process.env.N11_APP_SECRET;

    if (!APP_KEY || !APP_SECRET) {
      return res.status(500).json({
        message: "N11 API bilgileri eksik (.env kontrol et)",
      });
    }

    // --- 5) XML Gövdesi Hazırlama ---
    const xmlBody = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
        xmlns:sch="http://www.n11.com/ws/schemas">
        <soapenv:Header/>
        <soapenv:Body>
          <sch:SaveProductRequest>
            <auth>
              <appKey>${APP_KEY}</appKey>
              <appSecret>${APP_SECRET}</appSecret>
            </auth>

            <product>
              <title>${product.ad}</title>
              <subtitle></subtitle>
              <description>${product.aciklama || ""}</description>

              <category>
                <id>1002811</id>
              </category>

              <price>${product.satisFiyati}</price>
              <currencyType>1</currencyType>

              <images>
                ${
                  product.resimUrl
                    ? `<image><url>${product.resimUrl}</url></image>`
                    : ""
                }
              </images>

              <stockItems>
                <stockItem>
                  <quantity>${product.stok}</quantity>
                  <sellerStockCode>${product.sku || product.barkod || product._id}</sellerStockCode>
                </stockItem>
              </stockItems>

            </product>
          </sch:SaveProductRequest>
        </soapenv:Body>
      </soapenv:Envelope>
    `;

    // --- 6) N11’e Gönder ---
    const response = await axios.post(
      "https://api.n11.com/ws/ProductService",
      xmlBody,
      { headers: { "Content-Type": "text/xml;charset=UTF-8" } }
    );

    const parser = new xml2js.Parser({ explicitArray: false });
    const parsed = await parser.parseStringPromise(response.data);

    const result =
      parsed?.["soapenv:Envelope"]?.["soapenv:Body"]?.["ns3:SaveProductResponse"];

    if (!result) {
      return res.status(500).json({
        message: "N11 beklenmeyen cevap",
        raw: parsed,
      });
    }

    const n11ProductId = result?.product?.id;

    // --- 7) Ürüne N11 ID yaz ---
    if (n11ProductId) {
      await products.updateOne(
        { _id: new ObjectId(productId) },
        { $set: { n11ProductId: n11ProductId } }
      );
    }

    return res.status(200).json({
      success: true,
      message: "🎉 Ürün N11'e başarıyla yüklendi",
      n11ProductId,
      n11Response: result,
    });
  } catch (error) {
    console.error("N11 Add Product Error:", error);
    return res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
}
