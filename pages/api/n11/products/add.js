// 📁 /pages/api/n11/products/add.js
import axios from "axios";
import xml2js from "xml2js";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import N11Product from "@/models/N11Product";
import jwt from "jsonwebtoken";
import { getN11SettingsFromRequest } from "@/lib/n11Settings";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Only POST allowed" });
  }

  // 🔐 TOKEN KONTROL
  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(401).json({ success: false, message: "Token eksik" });
  }

  let user;
  try {
    const token = auth.split(" ")[1];
    user = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
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

  // 🔗 DB BAĞLANTISI
  await dbConnect();

  // 🧾 ÜRÜNÜ ÇEK
  const p = await Product.findById(productId);
  if (!p) {
    return res
      .status(404)
      .json({ success: false, message: "Ürün bulunamadı" });
  }

  // ✅ ZORUNLU ALAN KONTROLLERİ
  if (!p.n11CategoryId) {
    return res.status(400).json({
      success: false,
      message: "N11 kategorisi seçilmemiş (n11CategoryId boş).",
    });
  }

  if (!p.barkod && !p.sku) {
    return res.status(400).json({
      success: false,
      message: "N11 için barkod veya sku zorunlu.",
    });
  }

  const barkod = p.barkod || p.sku;
  const aciklama =
    p.aciklama && p.aciklama.trim().length > 0
      ? p.aciklama
      : p.ad || "Açıklama yok";

  // ✅ PROFESYONEL: DB settings + ENV fallback
  const cfg = await getN11SettingsFromRequest(req);

  const N11_APP_KEY = cfg.appKey || process.env.N11_APP_KEY;
  const N11_APP_SECRET = cfg.appSecret || process.env.N11_APP_SECRET;

  if (!N11_APP_KEY || !N11_APP_SECRET) {
    return res.status(500).json({
      success: false,
      message:
        "N11 API bilgileri eksik. API Ayarları'ndan girin veya ENV tanımlayın.",
    });
  }

  // ✅ Görsel normalize (images / resimUrl / resimUrls hepsi destek)
  const normalizedImages = []
    .concat(p.images || [])
    .concat(p.resimUrl ? [p.resimUrl] : [])
    .concat(p.resimUrls || [])
    .filter((u) => u && String(u).trim());

  // 🧩 N11 SAVE PRODUCT SOAP XML OLUŞTUR
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
          <title>${(p.ad || "").replace(/&/g, "&amp;").slice(0, 60)}</title>
          <description><![CDATA[${aciklama}]]></description>

          <category id="${p.n11CategoryId}"></category>

          <price>${String(p.satisFiyati || 0).replace(",", ".")}</price>
          <currencyType>${p.paraBirimi || "TRY"}</currencyType>

          <stockItems>
            <stockItem>
              <quantity>${p.stok || 0}</quantity>
              <sellerStockCode>${barkod}</sellerStockCode>
            </stockItem>
          </stockItems>

          ${
            normalizedImages.length > 0
              ? `
          <images>
            ${normalizedImages.map((u) => `<image><url>${u}</url></image>`).join("")}
          </images>`
              : ""
          }
        </product>

      </sch:SaveProductRequest>
    </soapenv:Body>
  </soapenv:Envelope>`.trim();

  try {
    const { data } = await axios.post("https://api.n11.com/ws/ProductService", xml, {
      headers: {
        "Content-Type": "text/xml;charset=UTF-8",
        SOAPAction:
          "http://www.n11.com/ws/schemas/ProductServicePort/SaveProduct",
      },
      timeout: 20000,
    });

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

    const result =
      resp.saveProductResponse || resp.SaveProductResponse || resp.result;

    if (!result) {
      return res.status(500).json({
        success: false,
        message: "N11 result alanı bulunamadı",
        raw: resp,
      });
    }

    const status = (result.status || result.resultStatus || "").toLowerCase();

    if (status !== "success") {
      return res.status(400).json({
        success: false,
        message:
          result.errorMessage ||
          result.errorReason ||
          "N11 ürün kaydı başarısız",
        code: result.errorCode,
        raw: result,
      });
    }

    const productData = result.product || resp.product;

    if (!productData) {
      return res.status(200).json({
        success: true,
        message: "Ürün N11'e gönderildi (productId dönmedi)",
        source: cfg.source || "env",
      });
    }

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
      source: cfg.source || "env",
    });
  } catch (err) {
    console.error("N11 SaveProduct Error:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: "N11 gönderim hatası",
      error: err.response?.data || err.message,
    });
  }
}
