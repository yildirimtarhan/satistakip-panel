import axios from "axios";
import xml2js from "xml2js";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import N11Product from "@/models/N11Product";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ success: false, message: "Only POST allowed" });

  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ success: false, message: "Token eksik" });

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

  const p = await Product.findById(productId);
  if (!p)
    return res.status(404).json({ success: false, message: "Ürün bulunamadı" });

  const { N11_APP_KEY, N11_APP_SECRET } = process.env;

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
          <description>${p.aciklama || p.ad}</description>

          <category>
            <id>${p.n11CategoryId}</id>
          </category>

          <price>${p.satisFiyati}</price>
          <currencyType>${p.paraBirimi || "TL"}</currencyType>

          <productSellerCode>${p.sku || p._id}</productSellerCode>

          <approvalStatus>WAITING</approvalStatus>

          <stockItems>
            <stockItem>
              <quantity>${p.stok}</quantity>
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
    const { data } = await axios.post(
      "https://api.n11.com/ws/ProductService",
      xml,
      {
        headers: {
          "Content-Type": "text/xml;charset=UTF-8",
          SOAPAction:
            "http://www.n11.com/ws/schemas/ProductServicePort/SaveProduct",
        },
      }
    );

    const parser = new xml2js.Parser({ explicitArray: false });
    const json = await parser.parseStringPromise(data);

    const resp =
      json["soapenv:Envelope"]?.["soapenv:Body"]?.[
        "ns3:SaveProductResponse"
      ];

    if (!resp)
      return res.status(500).json({
        success: false,
        message: "N11 yanıtı okunamadı",
        raw: json,
      });

    if (resp.result.status !== "success") {
      return res.status(400).json({
        success: false,
        message: resp.result.errorMessage,
        code: resp.result.errorCode,
      });
    }

    const productData = resp.product;
    const n11ProductId = productData.id;
    const stockItemId = productData.stockItems?.stockItem?.id || null;

    await N11Product.findOneAndUpdate(
      { erpProductId: p._id },
      {
        erpProductId: p._id,
        n11ProductId,
        stockItemId,
        title: p.ad,
        price: p.satisFiyati,
        stock: p.stok,
        sku: p.sku,
        raw: productData,
      },
      { upsert: true }
    );

    p.n11ProductId = n11ProductId;
    await p.save();

    res.status(200).json({
      success: true,
      message: "Ürün N11'e başarıyla gönderildi",
      n11ProductId,
      stockItemId,
    });
  } catch (err) {
    console.error("N11 AddProduct Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "N11 gönderim hatası",
      error: err.message,
    });
  }
}
