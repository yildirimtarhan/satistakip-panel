import jwt from "jsonwebtoken";
import axios from "axios";
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
      const rawAttrs = product.hbAttributes || {};
      let attributes = Array.isArray(rawAttrs)
        ? rawAttrs
        : Object.entries(rawAttrs).map(([k, v]) => ({ attributeId: Number(k) || 0, value: String(v ?? "") })).filter((a) => a.attributeId);
      if (!attributes.length) attributes = [{ attributeId: 12345, value: "Standart" }];

      if (variants) {
        const url = `${cfg.baseUrl}/product/api/v1/listings`;
        const results = [];
        for (let i = 0; i < variants.length; i++) {
          const v = variants[i];
          const suffix = [v.color, v.size].filter(Boolean).join(" / ");
          const name = suffix ? `${productName} - ${suffix}` : productName;
          const sku = String(v.sku || product.sku || merchantSku).trim() || `${merchantSku}-V${i + 1}`;
          const vBarcode = v.barcode || barcode;
          const vStock = Number(v.stock ?? 0) || 0;
          const vSale = Number(v.priceTl ?? salePrice) || 0;
          const vList = Number(v.priceTl ?? listPrice) || vSale;
          const vImgs = Array.isArray(v.images) && v.images.length > 0 ? v.images.filter((u) => u?.startsWith("http")) : images;
          const body = {
            name,
            brand: product.brandName || product.brand || "",
            barcode: vBarcode,
            categoryId: Number(product.categoryId),
            attributes,
            listPrice: vList,
            salePrice: vSale,
            vatRate: Number(product.vatRate ?? 18),
            stock: vStock,
            cargoCompanyId: 1,
            desi: Number(product.dimensionalWeight) || 1,
            description: product.description || productName,
            guaranteePeriod: product.guaranteePeriod != null ? String(product.guaranteePeriod) : "24",
            merchantSku: sku,
          };
          if (vImgs.length) body.images = vImgs;
          const r = await axios.post(url, body, { headers: hbApiHeaders(cfg, tokenObj), timeout: 20000 });
          results.push(r.data);
        }
        response = { data: results };
      } else {
        const body = {
          name: productName,
          brand: product.brandName || product.brand || "",
          barcode,
          categoryId: Number(product.categoryId),
          attributes,
          listPrice,
          salePrice,
          vatRate: Number(product.vatRate ?? 18),
          stock,
          cargoCompanyId: 1,
          desi: Number(product.dimensionalWeight) || 1,
          description: product.description || productName,
          guaranteePeriod: product.guaranteePeriod != null ? String(product.guaranteePeriod) : "24",
          merchantSku,
        };
        if (images.length) body.images = images;
        const url = `${cfg.baseUrl}/product/api/v1/listings`;
        response = await axios.post(url, body, {
          headers: hbApiHeaders(cfg, tokenObj),
          timeout: 20000,
        });
      }
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

    return res.status(status === 401 ? 401 : 500).json({
      success: false,
      message: userMessage,
      detail: typeof hbErr === "object" ? hbErr : { raw: hbErr },
    });
  }
}
