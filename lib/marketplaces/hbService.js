import { connectToDatabase } from "@/lib/mongodb";
import axios from "axios";

export async function getHBSettings({ companyId, userId }) {
  const envMerchantId = process.env.HEPSIBURADA_MERCHANT_ID || process.env.HB_MERCHANT_ID;
  const envAuth       = process.env.HEPSIBURADA_AUTH;
  const envBaseUrl    = process.env.HEPSIBURADA_BASE_URL;
  const envUserAgent  = process.env.HEPSIBURADA_USER_AGENT || "SatisTakip/1.0";
  const envUsername   = process.env.HB_USERNAME;
  const envPassword   = process.env.HB_PASSWORD || process.env.HEPSIBURADA_SECRET_KEY || process.env.HB_SECRET_KEY;
  const envTestMode   = process.env.HB_TEST_MODE === "true";

  let dbHB = {};
  try {
    const { db } = await connectToDatabase();
    const query = companyId ? { companyId } : { userId };
    const doc = await db.collection("settings").findOne(query);
    dbHB = doc?.hepsiburada || {};
  } catch {}

  const merchantId = dbHB.merchantId || envMerchantId || "";
  const username   = dbHB.username   || envUsername    || "";
  const password   = dbHB.password   || envPassword    || "";
  const testMode   = dbHB.testMode   ?? envTestMode;

  // HEPSIBURADA_AUTH varsa kullan; yoksa DB username:password'dan Basic token olustur
  let authToken = envAuth || "";
  if (!authToken && username && password) {
    authToken = Buffer.from(`${username}:${password}`).toString("base64");
  }
  if (!authToken && merchantId && password) {
    authToken = Buffer.from(`${merchantId}:${password}`).toString("base64");
  }

  // Katalog/ürün/kategori API'leri MPOP kullanır (oms-external değil)
  const mpopBase = process.env.HEPSIBURADA_MPOP_BASE_URL || process.env.HEPSIBURADA_CATALOG_BASE_URL;
  const isOmsOnly = envBaseUrl && envBaseUrl.includes("oms-external");
  const baseUrl =
    mpopBase ||
    (isOmsOnly ? (testMode ? "https://mpop-sit.hepsiburada.com" : "https://mpop.hepsiburada.com") : null) ||
    envBaseUrl ||
    (testMode ? "https://mpop-sit.hepsiburada.com" : "https://mpop.hepsiburada.com");

  return { merchantId, username, password, authToken, baseUrl, testMode, userAgent: envUserAgent };
}

export async function getHBToken(cfg) {
  if (!cfg.username && !cfg.password && !cfg.authToken) {
    throw new Error("Hepsiburada auth bilgileri eksik.");
  }
  // Direkt Basic auth – token fetch gerekmez
  return { type: "Basic", value: cfg.authToken };
}

export function buildAuthHeader(tokenObj) {
  return `${tokenObj.type} ${tokenObj.value}`;
}

export function hbApiHeaders(cfg, tokenObj) {
  return {
    Authorization: buildAuthHeader(tokenObj),
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": cfg.userAgent,
    merchantid: cfg.merchantId,
  };
}
