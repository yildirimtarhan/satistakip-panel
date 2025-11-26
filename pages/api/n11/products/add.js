// 📁 /pages/api/n11/products/add.js
import axios from "axios";
import xml2js from "xml2js";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import N11Product from "@/models/N11Product";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Only POST allowed" });
  }

  // 🔐 Token kontrolü
  const auth = req.headers.authorization;
  if (!auth) {
    return res
      .status(401)
      .json({ success: false, message: "Token eksik" });
  }

  let user;
  try {
    user = jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET);
  } catch {
    return res
      .status(401)
      .json({ success: false, message: "Geçersiz token" });
  }

  const { productId } = req.body;
  if (!productId) {
    return res
      .status(400)
      .json({ success: false, message: "productId zorunlu" });
  }

  await dbConnect();

  // 🗃 Ürünü çek
  const p = await Product.findById(productId);
  if (!p) {
    return res
      .status(404)
      .json({ success: false, message: "Ürün bulunamadı" });
  }

  if (!p.n11CategoryId) {
    return res.status(400).json({
      success: false,
      message: "Ürüne bağlı N11 kategori ID yok",
    });
  }

  const { N11_APP_KEY, N11_APP_SECRET } = process.env;
  if (!N11_APP_KEY || !N11_APP_SECRET) {
    return res.status(500).json({
      success: false,
      message: "N11 APP KEY / SECRET tanımlı değil",
    });
  }

  // 🧩 XML gövdesi (N11 SaveProductRequest)
  const barkod = p.barkod || p.sku || p._id.toString();
  const desc = p.aciklama || p.ad || "";

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
          <title>${(p.ad || "").replace(/&/g, "&amp;")}</title>
          <description><![CDATA[${desc}]]></description>

          <category id="${p.n11CategoryId}"></category>

          <price>${String(p.satisFiyati).replace(",", ".")}</price>
          <currencyType>${
            p.paraBirimi === "USD"
              ? "USD"
              : p.paraBirimi === "EUR"
              ? "EUR"
              : "TL"
          }</currencyType>

          <approvalStatus>WAITING</approvalStatus>

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
            <image>
              <url>${p.resimUrl}</url>
            </image>
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

    const resp =
      json["soapenv:Envelope"]?.["soapenv:Body"]?.[
        "ns3:SaveProductResponse"
      ] ||
      json["SOAP-ENV:Envelope"]?.["SOAP-ENV:Body"]?.[
        "ns3:SaveProductResponse"
      ] ||
      json.Envelope?.Body?.SaveProductResponse ||
      null;

    if (!resp) {
      console.error("N11 SaveProduct response parse edilemedi:", json);
      return res.status(500).json({
        success: false,
        message: "N11 yanıtı okunamadı",
      });
    }

    const result = resp.result || {};
    if ((result.status || result.resultStatus || "").toLowerCase() !== "success") {
      return res.status(400).json({
        success: false,
        message: result.errorMessage || "N11 ürün kaydı başarısız",
        code: result.errorCode || null,
      });
    }

    const productData = resp.product || {};
    const n11ProductId = productData.id || productData.productId || null;
    const stockItem =
      productData.stockItems?.stockItem || {};
    const stockItemId = stockItem.id || stockItem.stockItemId || null;

    // 🗃 N11Product kaydet / güncelle
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

    // ürün modeline de yaz
    p.n11ProductId = n11ProductId;
    await p.save();

    return res.status(200).json({
      success: true,
      message: "Ürün N11'e başarıyla gönderildi",
      n11ProductId,
      stockItemId,
    });
  } catch (err) {
    // 🔍 Hata detaylarını logla
    console.error("N11 AddProduct Error status:", err.response?.status);
    console.error("N11 AddProduct Error data:", err.response?.data);

    return res.status(500).json({
      success: false,
      message: `N11 gönderim hatası${
        err.response?.status ? ` (HTTP ${err.response.status})` : ""
      }`,
      error: err.response?.data || err.message,
    });
  }
}
