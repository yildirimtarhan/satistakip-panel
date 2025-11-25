// 📁 /pages/api/urunler/index.js
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import jwt from "jsonwebtoken";
import axios from "axios";
import xml2js from "xml2js";

// 🔧 N11 SaveProduct XML oluşturucu
function buildN11SaveProductXML(doc, n11CategoryId, appKey, appSecret) {
  const barkod = doc.barkod || doc.sku || doc._id?.toString();

  return `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
      xmlns:sch="http://www.n11.com/ws/schemas">
      <soapenv:Header/>
      <soapenv:Body>
        <sch:SaveProductRequest>
          <auth>
            <appKey>${appKey}</appKey>
            <appSecret>${appSecret}</appSecret>
          </auth>
          <product>
            <productSellerCode>${barkod}</productSellerCode>
            <title>${(doc.ad || "").replace(/&/g, "&amp;")}</title>
            <description><![CDATA[${doc.aciklama || doc.ad || ""}]]></description>
            <category id="${n11CategoryId}"></category>
            <price>${String(doc.satisFiyati).replace(",", ".")}</price>
            <currencyType>${
              doc.paraBirimi === "USD"
                ? "USD"
                : doc.paraBirimi === "EUR"
                ? "EUR"
                : "TL"
            }</currencyType>
            <stockItems>
              <stockItem>
                <quantity>${doc.stok}</quantity>
                <sellerStockCode>${barkod}</sellerStockCode>
              </stockItem>
            </stockItems>
          </product>
        </sch:SaveProductRequest>
      </soapenv:Body>
    </soapenv:Envelope>
  `;
}

export default async function handler(req, res) {
  res.setHeader("Allow", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    await dbConnect(); // 🔥 MONGOOSE BAĞLANTI

    // TOKEN KONTROL
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ message: "Token eksik" });

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ------------------------------
    // 📌 GET — Ürün Listele
    // ------------------------------
    if (req.method === "GET") {
      const list = await Product.find({}); // userId eklenecekse buraya
      return res.status(200).json(list);
    }

    // ------------------------------
    // 📌 POST — Ürün Ekle + N11 Gönderim
    // ------------------------------
    if (req.method === "POST") {
      const b = req.body || {};

      if (!b.ad || !b.satisFiyati) {
        return res
          .status(400)
          .json({ message: "Ürün adı ve satış fiyatı zorunlu" });
      }

      const newDoc = await Product.create({
        ad: b.ad,
        barkod: b.barkod || "",
        sku: b.sku || "",
        marka: b.marka || "",
        kategori: b.kategori || "",
        aciklama: b.aciklama || "",
        birim: b.birim || "Adet",

        resimUrl: b.resimUrl || "",
        varyantlar: b.varyantlar || [],

        alisFiyati: Number(b.alisFiyati || 0),
        satisFiyati: Number(b.satisFiyati),
        stok: Number(b.stok || 0),
        stokUyari: Number(b.stokUyari || 0),

        paraBirimi: b.paraBirimi || "TRY",
        kdvOrani: Number(b.kdvOrani || 20),

        n11: null,
      });

      // ------------------------------
      // 📌 Opsiyonel — N11 Gönderim
      // ------------------------------
      let n11Result = null;
      const appKey = process.env.N11_APP_KEY;
      const appSecret = process.env.N11_APP_SECRET;
      const n11CategoryId = b.n11CategoryId;

      if (appKey && appSecret && n11CategoryId) {
        try {
          const xmlBody = buildN11SaveProductXML(
            newDoc,
            n11CategoryId,
            appKey,
            appSecret
          );

          const { data } = await axios.post(
            "https://api.n11.com/ws/ProductService",
            xmlBody,
            {
              headers: { "Content-Type": "text/xml;charset=UTF-8" },
              timeout: 20000,
            }
          );

          const parsed = await new xml2js.Parser({
            explicitArray: false,
          }).parseStringPromise(data);

          const body =
            parsed?.["soapenv:Envelope"]?.["soapenv:Body"] ||
            parsed?.Envelope?.Body;

          const saveResp =
            body?.["ns3:SaveProductResponse"] ??
            body?.SaveProductResponse ??
            body?.["sch:SaveProductResponse"];

          const resultNode = saveResp?.result;

          if (!resultNode || resultNode.status !== "success") {
            n11Result = {
              success: false,
              message:
                resultNode?.errorMessage ||
                "N11 ürün kaydı başarısız oldu.",
            };
          } else {
            n11Result = { success: true };
          }
        } catch (error) {
          console.error("N11 Hatası:", error);
          n11Result = { success: false, message: error.message };
        }
      }

      return res.status(201).json({
        message: "Ürün eklendi",
        _id: newDoc._id,
        n11: n11Result,
      });
    }

    // ------------------------------
    // 📌 PUT — Ürün Güncelle
    // ------------------------------
    if (req.method === "PUT") {
      const { id } = req.query;

      await Product.findByIdAndUpdate(id, req.body);
      return res.status(200).json({ message: "Ürün güncellendi" });
    }

    // ------------------------------
    // 📌 DELETE — Ürün Sil
    // ------------------------------
    if (req.method === "DELETE") {
      const { id } = req.query;
      await Product.findByIdAndDelete(id);
      return res.status(200).json({ message: "Silindi" });
    }

    return res.status(405).json({ message: "Method Not Allowed" });
  } catch (err) {
    console.error("🔥 Ürün API Hatası:", err);
    return res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
}
