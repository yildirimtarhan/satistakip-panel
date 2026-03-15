/**
 * İdefix API bilgilerini alır: önce .env, yoksa istekteki token ile DB (API Ayarları).
 * Auth: VENDOR TOKEN = base64(ApiKey:ApiSecret), header: X-API-KEY
 * Satıcı paneli: Hesap Bilgilerim → Entegrasyon Bilgileri → Yeni API Oluştur
 */
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/mongodb";

function getTokenFromRequest(req) {
  if (!req?.headers) return null;
  const auth = req.headers.authorization;
  if (auth && /^Bearer\s+/i.test(auth)) return auth.replace(/^Bearer\s+/i, "").trim();
  const cookie = req.headers.cookie;
  if (cookie) {
    const m = cookie.match(/\btoken=([^;]+)/);
    if (m) return m[1].trim();
  }
  return null;
}

/**
 * @param {import('next').NextApiRequest} [req] - API route req
 * @returns {Promise<{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean } | null>}
 */
export async function getIdefixCredentials(req) {
  const apiKey = process.env.IDEFIX_API_KEY;
  const apiSecret = process.env.IDEFIX_API_SECRET;
  const vendorId = process.env.IDEFIX_VENDOR_ID;
  if (apiKey && apiSecret && vendorId) {
    return {
      apiKey: String(apiKey).trim(),
      apiSecret: String(apiSecret).trim(),
      vendorId: String(vendorId).trim(),
      testMode: process.env.IDEFIX_TEST_MODE === "true",
    };
  }

  if (!req) return null;

  const token = getTokenFromRequest(req);
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded?.userId ?? decoded?.id ?? decoded?._id;
    const companyId = decoded?.companyId ?? null;

    const { db } = await connectToDatabase();
    const query = companyId ? { companyId } : { userId };
    const doc = await db.collection("settings").findOne(query);
    const idefix = doc?.idefix || {};
    const key = (idefix.apiKey || "").trim();
    const secret = (idefix.apiSecret || "").trim();
    const vendor = (idefix.vendorId || "").trim();
    if (key && secret && vendor) {
      return {
        apiKey: key,
        apiSecret: secret,
        vendorId: vendor,
        testMode: idefix.testMode !== false,
      };
    }
  } catch (e) {}
  return null;
}

/**
 * companyId ile İdefix kimlik bilgilerini alır
 * @param {string} companyId
 * @returns {Promise<{ apiKey: string, apiSecret: string, vendorId: string, testMode: boolean } | null>}
 */
export async function getIdefixCredentialsByCompany(companyId) {
  const apiKey = process.env.IDEFIX_API_KEY;
  const apiSecret = process.env.IDEFIX_API_SECRET;
  const vendorId = process.env.IDEFIX_VENDOR_ID;
  if (apiKey && apiSecret && vendorId) {
    return {
      apiKey: String(apiKey).trim(),
      apiSecret: String(apiSecret).trim(),
      vendorId: String(vendorId).trim(),
      testMode: process.env.IDEFIX_TEST_MODE === "true",
    };
  }

  const { connectToDatabase } = await import("@/lib/mongodb");
  const { db } = await connectToDatabase();
  const doc = await db.collection("settings").findOne({ companyId: String(companyId) });
  const idefix = doc?.idefix || {};
  const key = (idefix.apiKey || "").trim();
  const secret = (idefix.apiSecret || "").trim();
  const vendor = (idefix.vendorId || "").trim();
  if (key && secret && vendor) {
    return {
      apiKey: key,
      apiSecret: secret,
      vendorId: vendor,
      testMode: idefix.testMode !== false,
    };
  }
  return null;
}
