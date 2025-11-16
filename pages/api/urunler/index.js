// 📁 /pages/api/urunler/index.js
import clientPromise from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
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
            <price>${doc.satisFiyati.toString().replace(",", ".")}</price>
            <currencyType>${doc.paraBirimi === "USD" ? "USD" : doc.paraBirimi === "EUR" ? "EUR" : "TL"}</currencyType>
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
    // ✅ Auth
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ message: "Token eksik" });

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const client = await clientPromise;
    const db = client.db("satistakip");
    const products = db.collection("products");

    // ✅ GET - Ürün Listele
    if (req.method === "GET") {
      const list = await products
        .find({ userId: decoded.userId })
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json(list);
    }

    // ✅ POST - Ürün Ekle (+ N11'e gönder)
    if (req.method === "POST") {
      const b = req.body || {};

      if (!b.ad || !b.satisFiyati)
        return res.status(400).json({ message: "Ürün adı ve satış fiyatı zorunlu" });

      const doc = {
        ad: b.ad.trim(),
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
        kdvOrani: Number(b.kdvOrani ?? 20),

        // 🔹 İleride N11 / Trendyol / HB alanları için alt objeleri burada genişletebiliriz
        n11: null,

        userId: decoded.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 🔸 Önce ERP'de ürünü kaydediyoruz
      const result = await products.insertOne(doc);

      let n11Result = null;

      // 🔹 N11 entegrasyonu isteğe bağlı (env + kategori varsa çalışsın)
      const appKey = process.env.N11_APP_KEY;
      const appSecret = process.env.N11_APP_SECRET;
      const n11CategoryId = b.n11CategoryId; // frontend'den gelecek

      if (appKey && appSecret && n11CategoryId) {
        try {
          const xmlBody = buildN11SaveProductXML(
            { ...doc, _id: result.insertedId },
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

          const parser = new xml2js.Parser({ explicitArray: false });
          const parsed = await parser.parseStringPromise(data);

          const body =
            parsed?.["SOAP-ENV:Envelope"]?.["SOAP-ENV:Body"] ||
            parsed?.["soapenv:Envelope"]?.["soapenv:Body"] ||
            parsed?.Envelope?.Body ||
            parsed;

          const saveResp =
            body?.["ns3:SaveProductResponse"] ||
            body?.SaveProductResponse ||
            body?.["sch:SaveProductResponse"] ||
            body?.["ns2:SaveProductResponse"];

          const resultNode = saveResp?.result;
          const status = resultNode?.status || resultNode?.resultStatus || "";
          const errorMessage = resultNode?.errorMessage || resultNode?.message || "";

          if (status && status.toLowerCase() !== "success") {
            n11Result = {
              success: false,
              status,
              message: errorMessage || "N11 SaveProduct başarısız döndü",
            };
          } else {
            const product = saveResp?.product || saveResp?.savedProduct || null;

            const productId =
              product?.id || product?.productId || null;

            const stockItem =
              product?.stockItems?.stockItem || null;

            const stockItemId =
              stockItem?.id || stockItem?.stockItemId || null;

            const approvalStatus =
              product?.approvalStatus || product?.status || "";

            // 🔸 Ürünü N11 bilgileri ile güncelle
            await products.updateOne(
              { _id: result.insertedId },
              {
                $set: {
                  n11: {
                    productId,
                    stockItemId,
                    status: approvalStatus,
                    categoryId: n11CategoryId,
                  },
                  updatedAt: new Date(),
                },
              }
            );

            n11Result = {
              success: true,
              productId,
              stockItemId,
              status: approvalStatus,
            };
          }
        } catch (n11Err) {
          console.error("N11 SaveProduct Hatası:", n11Err?.message || n11Err);
          n11Result = {
            success: false,
            message: "N11 SaveProduct çağrısı sırasında hata oluştu",
            error: n11Err?.message || String(n11Err),
          };
          // ❗ Burada ERP ürünü silmiyoruz, sadece N11 kısmı hatalı kalır.
        }
      }

      return res.status(201).json({
        message: "✅ Ürün eklendi",
        _id: result.insertedId,
        n11: n11Result,
      });
    }

    // ✅ PUT - Ürün Güncelle (şimdilik sadece ERP tarafı)
    // (Bir sonraki adımda burada N11 stok/fiyat güncellemesini de ekleyeceğiz)
    if (req.method === "PUT") {
      const { id } = req.query;
      if (!id) return res.status(400).json({ message: "Ürün ID eksik" });

      const b = req.body;

      const update = {
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
        stok: Number(b.stok),
        stokUyari: Number(b.stokUyari || 0),
        paraBirimi: b.paraBirimi,
        kdvOrani: Number(b.kdvOrani),

        updatedAt: new Date(),
      };

      await products.updateOne(
        { _id: new ObjectId(id), userId: decoded.userId },
        { $set: update }
      );

      // 🔜 Buraya N11 stok/fiyat update geleceğiz (sonraki adım)
      return res.status(200).json({ message: "✅ Ürün güncellendi" });
    }

    // ✅ DELETE - Ürün Sil
    if (req.method === "DELETE") {
      const { id } = req.query;
      if (!id) return res.status(400).json({ message: "ID eksik" });

      await products.deleteOne({ _id: new ObjectId(id), userId: decoded.userId });

      return res.status(200).json({ message: "🗑️ Ürün silindi" });
    }

    return res.status(405).json({ message: "Method not allowed" });

  } catch (err) {
    console.error("🔥 Ürün API Hatası:", err);
    return res.status(500).json({ message: "Sunucu hatası", error: err.message });
  }
}
