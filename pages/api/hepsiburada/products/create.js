import jwt from "jsonwebtoken";
import axios from "axios";
import FormData from "form-data";
import { getHBSettings, getHBToken, hbApiHeaders } from "@/lib/marketplaces/hbService";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false });
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyId = decoded?.companyId;
    const userId = decoded?.userId || decoded?.id || decoded?._id;

    const cfg = await getHBSettings({ companyId, userId });
    if (!cfg.merchantId || !cfg.authToken) {
      return res.status(400).json({
        success: false,
        message: "Merchant ID veya auth token eksik. API Ayarlarindan girin ya da HEPSIBURADA_AUTH env var tanimlayin.",
      });
    }

    const { product } = req.body;
    if (!product) return res.status(400).json({ success: false, message: "product verisi zorunlu" });

    const tokenObj = await getHBToken(cfg);

    const images = (product.images || []).filter((u) => u?.startsWith("http"));
    const productName = product.title || product.productName || "";
    const merchantSku = product.stockCode || product.barcode || product.sku || "";
    const barcode = product.barcode || product.stockCode || "";
    const listPrice = Number(product.listPrice ?? product.price ?? 0) || 0;
    const salePrice = Number(product.price ?? 0) || 0;
    const stock = Number(product.stock ?? product.quantity ?? 1) || 1;

    const useFastListing = cfg.testMode || (cfg.baseUrl || "").includes("mpop-sit");
    const variants = Array.isArray(product.variants) && product.variants.length > 0 ? product.variants : null;

    let response;
    if (useFastListing) {
      const url = `${cfg.baseUrl}/product/api/products/fastlisting`;
      const items = variants
        ? variants.map((v, i) => {
            const suffix = [v.color, v.size].filter(Boolean).join(" / ");
            const name = suffix ? `${productName} - ${suffix}` : productName;
            const sku = String(v.sku || product.sku || merchantSku).trim() || `${merchantSku}-V${i + 1}`;
            const vStock = Number(v.stock ?? 0) || 0;
            const vPrice = Number(v.priceTl ?? salePrice) || 0;
            return {
              merchant: cfg.merchantId,
              merchantSku: sku,
              productName: name,
              ...(v.barcode && { barcode: String(v.barcode) }),
              ...(vStock > 0 && { stock: String(vStock) }),
              ...(vPrice > 0 && { price: String(vPrice) }),
            };
          })
        : [
            {
              merchant: cfg.merchantId,
              merchantSku,
              productName,
              ...(barcode && { barcode }),
              ...(stock > 0 && { stock: String(stock) }),
              ...((salePrice || listPrice) > 0 && { price: String(salePrice || listPrice) }),
            },
          ];
      response = await axios.post(url, items, {
        headers: hbApiHeaders(cfg, tokenObj),
        timeout: 20000,
      });
    } else {
      // Canlı: /product/api/products/import (Ürün Bilgisi Gönderme) — /api/v1/listings canlıda 404
      const url = `${cfg.baseUrl}/product/api/products/import`;
      const vatRate = String(product.vatRate ?? 18).replace(".", ",");
      const desi = Number(product.dimensionalWeight) || 1;
      const guarantee = Number(product.guaranteePeriod ?? 24);
      const brand = product.brandName || product.brand || "Bilinmeyen";
      const description = (product.description || productName || "").substring(0, 5000);

      const toImportItem = (v, idx) => {
        const suffix = v ? [v.color, v.size].filter(Boolean).join(" / ") : "";
        const name = suffix ? `${productName} - ${suffix}` : productName;
        const sku = v ? (String(v.sku || product.sku || merchantSku).trim() || `${merchantSku}-V${idx + 1}`) : merchantSku;
        const vBarcode = v?.barcode || barcode;
        const vStock = v ? Number(v.stock ?? 0) || 0 : stock;
        const vPrice = v ? Number(v.priceTl ?? salePrice) || 0 : (salePrice || listPrice);
        const vImgs = v && Array.isArray(v.images) && v.images.length > 0 ? v.images.filter((u) => u?.startsWith("http")) : images;
        const attrs = {
          merchantSku: sku,
          VaryantGroupID: product.variantGroupId || `HB-${merchantSku}`,
          Barcode: String(vBarcode || ""),
          UrunAdi: name,
          UrunAciklamasi: description,
          Marka: brand,
          GarantiSuresi: guarantee,
          kg: String(desi),
          tax_vat_rate: vatRate,
          price: String(vPrice).replace(".", ","),
          stock: String(vStock),
        };
        if (v?.color) attrs.renk_variant_property = String(v.color);
        if (v?.size) attrs.ebatlar_variant_property = String(v.size);
        vImgs.slice(0, 5).forEach((img, i) => {
          if (img) attrs[`Image${i + 1}`] = img;
        });
        return { categoryId: Number(product.categoryId), merchant: cfg.merchantId, attributes: attrs };
      };

      const importItems = variants
        ? variants.map((v, i) => toImportItem(v, i))
        : [toImportItem(null, 0)];

      const form = new FormData();
      form.append("file", Buffer.from(JSON.stringify(importItems)), {
        filename: "products.json",
        contentType: "application/json",
      });

      const headers = { ...hbApiHeaders(cfg, tokenObj), ...form.getHeaders() };
      const r = await axios.post(url, form, { headers, timeout: 30000, maxBodyLength: Infinity });
      response = r;
    }

    const variantCount = variants ? variants.length : 0;
    return res.json({
      success: true,
      data: response.data,
      message: useFastListing
        ? variantCount > 0
          ? `Hepsiburada TEST (Hızlı Ürün): ${variantCount} varyant gönderildi.`
          : "Hepsiburada TEST (Hızlı Ürün Yükleme) ile gönderildi. Ürün HB kataloğunda + barkod kayıtlı olmalı."
        : variantCount > 0
          ? `Hepsiburada'ya ${variantCount} varyant gönderildi.`
          : cfg.testMode
            ? "Hepsiburada TEST ortamina gonderildi."
            : "Hepsiburada'ya gonderildi.",
      testMode: cfg.testMode,
      usedFastListing: useFastListing,
      variantCount: variantCount || undefined,
    });
  } catch (err) {
    const hbErr = err?.response?.data;
    const status = err?.response?.status;
    const rawMsg = typeof hbErr === "string" ? hbErr : (hbErr?.message || hbErr?.description || hbErr?.errors?.[0] || err.message);
    console.error("HB CREATE ERROR:", JSON.stringify(hbErr || err.message));

    let userMessage = rawMsg;
    if (status === 401 || (rawMsg && String(rawMsg).toLowerCase().includes("not authorized"))) {
      userMessage =
        "Hepsiburada kimlik doğrulama hatası (401). API Ayarlarından Kullanıcı adı (Merchant ID) ve Şifre (Secret Key) değerlerini kontrol edin. " +
        "Test hesabında Merchant ID’de genelde 4809 kullanılır (4800 yazılmış olabilir).";
    }
    if (status === 404) {
      userMessage = "Hepsiburada API endpoint bulunamadı (404). Canlı ortamda Ürün Bilgisi Gönderme (import) kullanılıyor.";
    }

    return res.status(status === 401 ? 401 : 500).json({
      success: false,
      message: userMessage,
      detail: typeof hbErr === "object" ? hbErr : { raw: hbErr },
    });
  }
}
