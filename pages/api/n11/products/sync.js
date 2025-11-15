import axios from "axios";
import xml2js from "xml2js";
import { connectToDatabase } from "@/lib/mongodb";
import N11Product from "@/models/N11Product";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Only GET allowed" });
  }

  try {
    // Mongo bağlantısı
    await connectToDatabase();

    const xmlBody = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
        xmlns:sch="http://www.n11.com/ws/schemas">
        <soapenv:Header/>
        <soapenv:Body>
          <sch:GetProductListRequest>
            <auth>
              <appKey>${process.env.N11_APP_KEY}</appKey>
              <appSecret>${process.env.N11_APP_SECRET}</appSecret>
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

    // XML → JSON parser
    const parser = new xml2js.Parser({ explicitArray: false });
    const parsed = await parser.parseStringPromise(response.data);

    // Body al
    const body = parsed["soapenv:Envelope"]?.["soapenv:Body"];
    if (!body) {
      return res.json({ success: false, message: "Response Body bulunamadı" });
    }

    // Namespace fark etmeksizin response’u bul
    const responseKey = Object.keys(body).find((k) =>
      k.toLowerCase().includes("getproductlistresponse")
    );

    if (!responseKey) {
      return res.json({
        success: true,
        count: 0,
        products: [],
        message: "N11 ürün response bulunamadı (namespace farkı)",
      });
    }

    // Ürün listesi
    const productList = body[responseKey]?.products?.product || [];

    if (!productList || productList.length === 0) {
      return res.json({
        success: true,
        count: 0,
        products: [],
        message: "N11 ürünü bulunamadı.",
      });
    }

    // Eğer tek ürünse array'e çevir
    const list = Array.isArray(productList) ? productList : [productList];

    let saved = 0;

    // MongoDB'ye kaydet
    for (const p of list) {
      await N11Product.findOneAndUpdate(
        { sellerProductCode: p.sellerStockCode },
        {
          sellerProductCode: p.sellerStockCode,
          productId: p.productId,
          title: p.title,
          price: p.displayPrice,
          stock: p.stockItems?.stockItem?.quantity,
          approvalStatus: p.approvalStatus,
          brand: p.brand,
          raw: p
        },
        { upsert: true }
      );
      saved++;
    }

    return res.json({
      success: true,
      message: "N11 ürün senkron tamamlandı",
      count: saved
    });

  } catch (err) {
    console.error("N11 Sync Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "N11 Sync Error",
      error: err.message,
    });
  }
}
