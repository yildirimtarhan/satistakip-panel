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
    const appKey = process.env.N11_APP_KEY;
    const appSecret = process.env.N11_APP_SECRET;

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

    // 🚀 Doğru SOAP Endpoint
    const response = await axios.post(
      "https://api.n11.com/ws/ProductService.wsdl",
      xmlBody,
      { headers: { "Content-Type": "text/xml;charset=UTF-8" } }
    );

    const parser = new xml2js.Parser({ explicitArray: false });
    const parsed = await parser.parseStringPromise(response.data);

    // === Body seçimi (tüm namespace'lere uyumlu) ===
    const envelope = parsed?.Envelope || parsed?.["soapenv:Envelope"];
    const body = envelope?.Body || envelope?.["soapenv:Body"];

    // === Response mapping ===
    const resp =
      body?.GetProductListResponse ||
      body?.["ns2:GetProductListResponse"] ||
      body?.["ns3:GetProductListResponse"] ||
      body?.["sch:GetProductListResponse"] ||
      null;

    if (!resp) {
      return res.status(500).json({
        success: false,
        message: "N11 yanıtı çözümlenemedi (namespace uyumsuz)"
      });
    }

    let products =
      resp?.products?.product ||
      resp?.productList?.product ||
      [];

    // Tek ürün bile gelse array'e çevir
    products = Array.isArray(products) ? products : [products];

    if (products.length === 0) {
      return res.json({
        success: true,
        count: 0,
        products: [],
        message: "N11 ürün bulunamadı."
      });
    }

    // === MongoDB Kaydet ===
    let saved = 0;
    for (const p of products) {
      await N11Product.findOneAndUpdate(
        { sellerProductCode: p.sellerStockCode },
        {
          sellerProductCode: p.sellerStockCode,
          productId: p.id || p.productId,
          title: p.title,
          price: p.displayPrice,
          stock: p.stockItems?.stockItem?.quantity ?? 0,
          approvalStatus: p.approvalStatus,
          brand: p.brand,
          categoryFullPath: p.categoryName,
          imageUrls: p.images?.image?.map((i) => i.url) || [],
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
    console.error("N11 Sync Error:", error);
    return res.status(500).json({
      success: false,
      message: "N11 Sync Error",
      error: error.message
    });
  }
}
