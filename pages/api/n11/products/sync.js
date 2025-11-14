import axios from "axios";
import xml2js from "xml2js";
import { connectToDatabase } from "@/lib/mongodb";
import mongoose from "mongoose";

// =====================
// MODEL
// =====================
const N11ProductSchema = new mongoose.Schema(
  {
    productId: String,
    sellerProductCode: String,
    title: String,
    price: Number,
    stock: Number,
    approvalStatus: String,
    brand: String,
    categoryFullPath: String,
    imageUrls: [String],
    raw: Object
  },
  { timestamps: true }
);

const N11Product =
  mongoose.models.N11Product ||
  mongoose.model("N11Product", N11ProductSchema);

// =====================
// HANDLER
// =====================
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Only GET allowed" });
  }

  try {
    // MongoDB bağlantısı
    await connectToDatabase();

    const appKey = process.env.N11_APP_KEY;
    const appSecret = process.env.N11_APP_SECRET;

    if (!appKey || !appSecret) {
      return res.status(400).json({ message: "N11 API bilgileri eksik" });
    }

    // XML REQUEST
    const xmlBody = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
        xmlns:sch="http://www.n11.com/ws/schemas">
        <soapenv:Header/>
        <soapenv:Body>
          <sch:GetProductListRequest>
            <auth>
              <appKey>${appKey}</appKey>
              <appSecret>${appSecret}</appSecret>
            </auth>
            <pagingData>
              <currentPage>0</currentPage>
              <pageSize>100</pageSize>
            </pagingData>
          </sch:GetProductListRequest>
        </soapenv:Body>
      </soapenv:Envelope>
    `;

    const response = await axios.post(
      "https://api.n11.com/ws/ProductService.wsdl",
      xmlBody,
      { headers: { "Content-Type": "text/xml;charset=UTF-8" } }
    );

    const parser = new xml2js.Parser({ explicitArray: false });
    const parsed = await parser.parseStringPromise(response.data);

    // ============================
    //   ÜRÜN LİSTESİ OKUMA
    // ============================
    let productList =
      parsed["SOAP-ENV:Envelope"]?.["SOAP-ENV:Body"]?.["ns3:GetProductListResponse"]
        ?.products?.product;

    if (!productList) {
      productList = [];
    }

    // Tek ürün varsa → array'e çevir
    if (!Array.isArray(productList)) {
      productList = [productList];
    }

    let saved = 0;

    for (const p of productList) {
      const sellerCode =
        p.sellerProductCode ||
        p.sellerStockCode ||
        p.stockItems?.stockItem?.sellerStockCode ||
        null;

      await N11Product.findOneAndUpdate(
        { sellerProductCode: sellerCode },
        {
          productId: p.productId,
          sellerProductCode: sellerCode,
          title: p.title,
          price: p.displayPrice,
          stock: p.stockItems?.stockItem?.quantity || 0,
          approvalStatus: p.approvalStatus,
          brand: p.brand,
          categoryFullPath: p.categoryName,
          imageUrls:
            p.images?.image
              ? Array.isArray(p.images.image)
                ? p.images.image.map((x) => x.url?._ || "")
                : [p.images.image.url?._ || ""]
              : [],
          raw: p
        },
        { upsert: true }
      );

      saved++;
    }

    return res.json({
      success: true,
      message: "N11 ürünleri başarıyla senkron edildi",
      count: saved
    });

  } catch (error) {
    console.error("N11 Sync Error:", error.message);
    res.status(500).json({
      success: false,
      message: "N11 Sync Error",
      error: error.message
    });
  }
}
