/**
 * Ortak stok → Pazaryerlerine anlık push
 * ERP (Product.stock) değiştiğinde Hepsiburada, N11, Trendyol, Pazarama'ya stok güncellemesi gönderir.
 * Fire-and-forget: ana akışı bloklamaz, hatalar loglanır.
 * Multi-tenant: companyId ile her firma kendi API bilgilerini kullanır.
 */
import dbConnect from "@/lib/dbConnect";
import { connectToDatabase } from "@/lib/mongodb";
import Product from "@/models/Product";
import axios from "axios";
import { getHBSettings, getHBToken } from "@/lib/marketplaces/hbService";
import { getN11SettingsFromDB } from "@/lib/marketplaces/n11Service";
import { priceAndInventoryUrl } from "@/lib/marketplaces/trendyolConfig";
import { getPazaramaCredentialsByCompany } from "@/lib/getPazaramaCredentials";
import { pazaramaUpdateStock } from "@/lib/marketplaces/pazaramaService";
import mongoose from "mongoose";

/**
 * Stok değişen ürünlerin güncel stokunu pazaryerlerine push eder.
 * @param {string[]|mongoose.Types.ObjectId[]} productIds
 * @param {{ companyId: string, userId?: string }} ctx
 */
export async function pushStockToMarketplaces(productIds, ctx) {
  if (!productIds?.length || !ctx?.companyId) return;

  const ids = productIds.map((id) => (typeof id === "string" && mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id)).filter(Boolean);
  if (!ids.length) return;

  setImmediate(async () => {
    try {
      await dbConnect();
      const { db } = await connectToDatabase();

      const products = await Product.find({ _id: { $in: ids }, companyId: ctx.companyId }).lean();
      if (!products.length) return;

      const companyIdStr = String(ctx.companyId);
      const userIdStr = ctx.userId ? String(ctx.userId) : null;

      // ─── Hepsiburada ───
      try {
        const cfg = await getHBSettings({ companyId: companyIdStr, userId: userIdStr });
        if (cfg?.merchantId && cfg?.authToken) {
          const mappings = await db.collection("hb_erp_mappings").find({ companyId: companyIdStr }).toArray();
          const productIdToMerchantSku = {};
          const productIdSet = new Set(products.map((p) => String(p._id)));
          mappings.forEach((m) => {
            const pid = String(m.productId || "").trim();
            if (pid && productIdSet.has(pid)) productIdToMerchantSku[pid] = m.merchantSku;
          });

          const items = [];
          for (const p of products) {
            const merchantSku = productIdToMerchantSku[String(p._id)] ?? p.sku ?? p.barcode;
            if (!merchantSku) continue;
            const stock = Math.max(0, Number(p.stock ?? 0));
            items.push({ merchantSku, availableStock: stock });
          }
          if (items.length) {
            const tokenObj = await getHBToken(cfg);
            const env = process.env.HEPSIBURADA_LISTING_BASE_URL || process.env.HB_LISTING_BASE_URL;
            const base = env ? env.replace(/\/$/, "") : cfg.testMode ? "https://listing-external-sit.hepsiburada.com" : "https://listing-external.hepsiburada.com";
            const url = `${base}/listings/merchantid/${encodeURIComponent(cfg.merchantId)}/inventory-uploads`;
            await axios.post(url, items, {
              headers: {
                Authorization: `${tokenObj.type} ${tokenObj.value}`,
                "Content-Type": "application/json",
                "User-Agent": cfg.userAgent || "SatisTakip/1.0",
              },
              timeout: 15000,
            });
            console.log(`[pazaryeriStockSync] HB: ${items.length} ürün stok güncellendi`);
          }
        }
      } catch (e) {
        console.warn("[pazaryeriStockSync] Hepsiburada:", e.message);
      }

      // ─── N11 ───
      try {
        const cfg = await getN11SettingsFromDB({ companyId: companyIdStr, userId: userIdStr });
        if (cfg?.appKey && cfg?.appSecret) {
          const skus = [];
          for (const p of products) {
            const stockCode = p.marketplaceSettings?.n11?.sellerSku || p.sku || p.barcode;
            if (!stockCode) continue;
            skus.push({
              stockCode,
              quantity: Math.max(0, Number(p.stock ?? 0)),
              salePrice: Number(p.priceTl ?? p.price ?? 0),
              listPrice: Math.max(Number(p.priceTl ?? p.price ?? 0) * 1.1, Number(p.priceTl ?? p.price ?? 0) + 0.01),
              currencyType: "TL",
            });
          }
          if (skus.length) {
            await axios.post(
              "https://api.n11.com/ms/product/tasks/price-stock-update",
              { payload: { integrator: cfg.integrator || "SatisTakip", skus } },
              { headers: { "Content-Type": "application/json", appkey: cfg.appKey, appsecret: cfg.appSecret }, timeout: 15000 }
            );
            console.log(`[pazaryeriStockSync] N11: ${skus.length} ürün stok güncellendi`);
          }
        }
      } catch (e) {
        console.warn("[pazaryeriStockSync] N11:", e.message);
      }

      // ─── Trendyol ───
      try {
        const creds = await getTrendyolCredentialsByCompany(companyIdStr);
        if (creds?.supplierId && creds?.apiKey && creds?.apiSecret) {
          const items = [];
          for (const p of products) {
            const barcode = String(p.barcode || p.sku || "").trim();
            if (!barcode) continue;
            items.push({
              barcode,
              quantity: Math.max(0, Number(p.stock ?? 0)),
              salePrice: Number(p.priceTl ?? p.price ?? 0),
              listPrice: Math.max(Number(p.priceTl ?? p.price ?? 0) * 1.1, Number(p.priceTl ?? p.price ?? 0) + 0.01),
            });
          }
          if (items.length) {
            const auth = Buffer.from(`${creds.apiKey}:${creds.apiSecret}`).toString("base64");
            const url = priceAndInventoryUrl(creds.supplierId);
            await axios.post(url, { items }, {
              headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json", "User-Agent": "SatisTakip/1.0" },
              timeout: 15000,
            });
            console.log(`[pazaryeriStockSync] Trendyol: ${items.length} ürün stok güncellendi`);
          }
        }
      } catch (e) {
        console.warn("[pazaryeriStockSync] Trendyol:", e.message);
      }

      // ─── Pazarama (multi-tenant: companyId ile settings'ten alır) ───
      try {
        const creds = await getPazaramaCredentialsByCompany(companyIdStr);
        if (creds?.apiKey && creds?.apiSecret) {
          const items = [];
          for (const p of products) {
            const code = String(p.barcode || p.sku || "").trim();
            if (!code) continue;
            items.push({
              code,
              stockCount: Math.max(0, Number(p.stock ?? 0)),
            });
          }
          if (items.length) {
            await pazaramaUpdateStock(creds, items);
            console.log(`[pazaryeriStockSync] Pazarama: ${items.length} ürün stok güncellendi`);
          }
        }
      } catch (e) {
        console.warn("[pazaryeriStockSync] Pazarama:", e.message);
      }
    } catch (e) {
      console.error("[pazaryeriStockSync] Genel hata:", e.message);
    }
  });
}

async function getTrendyolCredentialsByCompany(companyId) {
  const sid = process.env.TRENDYOL_SUPPLIER_ID;
  const key = process.env.TRENDYOL_API_KEY;
  const secret = process.env.TRENDYOL_API_SECRET;
  if (sid && key && secret) return { supplierId: sid.trim(), apiKey: key.trim(), apiSecret: secret.trim() };

  const { db } = await connectToDatabase();
  const doc = await db.collection("settings").findOne({ companyId: String(companyId) });
  const ty = doc?.trendyol || {};
  const supplierId = (ty.supplierId || "").trim();
  const apiKey = (ty.apiKey || "").trim();
  const apiSecret = (ty.apiSecret || "").trim();
  if (supplierId && apiKey && apiSecret) return { supplierId, apiKey, apiSecret };
  return null;
}
