import axios from "axios";
import xml2js from "xml2js";
import { connectToDatabase } from "@/lib/mongodb";
import N11Product from "@/models/N11Product";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Only GET allowed" });
  }

  try {
    const { db } = await connectToDatabase();

    const appKey = process.env.N11_APP_KEY;
    const appSecret = process.env.N11_APP_SECRET;

    if (!appKey || !appSecret) {
      return res.status(400).json({
        success: false,
        message: "N11 API bilgileri eksik (.env dosyasını kontrol et)",
      });
    }

    // --- SOAP XML Body ---
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

    const productList =
      parsed["soapenv:Envelope"]?.["soapenv:Body"]?.["ns3:GetProductListResponse"]
        ?.products?.product;

    if (!productList) {
      return res.json({
        success: true,
        count: 0,
        products: [],
        message: "N11 ürünü bulunamadı.",
      });
    }

    const list = Array.isArray(productList) ? productList : [productList];
    let saved = 0;

    for (const p of list) {
      await N11Product.updateOne(
        { sellerProductCode: p.sellerStockCode },
        {
          $set: {
            productId: p.productId,
            sellerProductCode: p.sellerStockCode,
            title: p.title,
            price: p.displayPrice,
            oldPrice: p.oldPrice,
            currency: p.currencyAmount,
            approvalStatus: p.approvalStatus,
            stock: p.stockItems?.stockItem?.quantity || 0,
            category: p.categoryName,
            brand: p.brand,
            imageUrls:
              p.images?.image?.map((x) => x.url) ||
              (p.images?.image?.url ? [p.images.image.url] : []),
            raw: p,
          },
        },
        { upsert: true }
      );
      saved++;
    }

    return res.json({
      success: true,
      message: "N11 ürünleri başarıyla senkron edildi",
      count: saved,
    });
  } catch (error) {
    console.error("N11 Sync Error:", error);
    return res.status(500).json({
      success: false,
      message: "N11 Sync Error",
      error: error.message,
    });
  }
}
