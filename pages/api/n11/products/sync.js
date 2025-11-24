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

    const response = await axios.post(
      "https://api.n11.com/ws/ProductService.svc",
      xmlBody,
      {
        headers: {
          "Content-Type": "text/xml;charset=UTF-8",
          "SOAPAction": "http://www.n11.com/ws/GetProductList"
        }
      }
    );

    const parser = new xml2js.Parser({ explicitArray: false });
    const parsed = await parser.parseStringPromise(response.data);

    const productResponse =
      parsed?.Envelope?.Body?.GetProductListResponse ||
      parsed?.["SOAP-ENV:Envelope"]?.["SOAP-ENV:Body"]?.["ns3:GetProductListResponse"];

    if (!productResponse?.products?.product) {
      return res.json({
        success: true,
        message: "N11 ürünü bulunamadı",
        count: 0,
        products: []
      });
    }

    const products = Array.isArray(productResponse.products.product)
      ? productResponse.products.product
      : [productResponse.products.product];

    let saved = 0;

    for (const p of products) {
      await N11Product.findOneAndUpdate(
        { sellerProductCode: p.productSellerCode || p.sellerStockCode },
        {
          sellerProductCode: p.productSellerCode || p.sellerStockCode,
          productId: p.id,
          title: p.title,
          price: Number(p.displayPrice || p.price || 0),
          stock: Number(
            p.stockItems?.stockItem?.quantity ??
            p.stockItems?.stockItem?.[0]?.quantity ??
            0
          ),
          approvalStatus: p.approvalStatus,
          brand: p.brand,
          categoryFullPath: p.categoryName,
          imageUrls: [],
          raw: p
        },
        { upsert: true }
      );
      saved++;
    }

    return res.json({
      success: true,
      message: "N11 ürünleri başarıyla senkron edildi",
      count: saved,
      products
    });

  } catch (error) {
    console.error("N11 sync error:", error);
    return res.status(500).json({
      success: false,
      message: "N11 ürünleri alınamadı",
      error: error.message
    });
  }
}
