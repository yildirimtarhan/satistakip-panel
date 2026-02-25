import { connectToDatabase } from "@/lib/mongodb";
import axios from "axios";

export async function getHBSettings({ companyId, userId }) {
  // ENV'den direkt oku (Render / production ortami)
  const envMerchantId = process.env.HEPSIBURADA_MERCHANT_ID || process.env.HB_MERCHANT_ID;
  const envAuthToken  = process.env.HEPSIBURADA_AUTH;          // hazir base64 auth token
  const envBaseUrl    = process.env.HEPSIBURADA_BASE_URL;
  const envUsername   = process.env.HB_USERNAME;
  const envPassword   = process.env.HB_PASSWORD;
  const envTestMode   = process.env.HB_TEST_MODE === "true";

  // DB'den oku (raw MongoDB - Settings mongoose modelindeki schema kisitlarindan bagimsiz)
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
  const authToken  = envAuthToken    || "";            // dogrudan kullanilacak auth header
  const baseUrl    = envBaseUrl      || (dbHB.testMode ? "https://mpop-sit.hepsiburada.com" : "https://mpop.hepsiburada.com");
  const testMode   = dbHB.testMode   ?? envTestMode;

  return { merchantId, username, password, authToken, baseUrl, testMode };
}

export function hbBaseUrl(testMode) {
  return testMode
    ? "https://mpop-sit.hepsiburada.com"
    : "https://mpop.hepsiburada.com";
}

export async function getHBToken(cfg) {
  // 1) Render'da HEPSIBURADA_AUTH hazir token tanimli ise direkt kullan
  if (cfg.authToken) {
    return { type: "Basic", value: cfg.authToken };
  }

  // 2) username + password ile JWT al
  if (!cfg.username || !cfg.password) {
    throw new Error("Hepsiburada kullanici adi veya sifresi eksik. API Ayarlarindan girin.");
  }

  const base = cfg.baseUrl || hbBaseUrl(cfg.testMode);
  const res = await axios.post(
    `${base}/api/authenticate`,
    { username: cfg.username, password: cfg.password, authenticationType: "INTEGRATOR" },
    { headers: { "Content-Type": "application/json" }, timeout: 12000 }
  );
  const token = res.data?.token || res.data?.jwt;
  if (!token) throw new Error("Token alinamadi: " + JSON.stringify(res.data));
  return { type: "Bearer", value: token };
}

export function buildAuthHeader(tokenObj) {
  return `${tokenObj.type} ${tokenObj.value}`;
}
