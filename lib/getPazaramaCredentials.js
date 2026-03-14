/**
 * Pazarama API bilgilerini alır: önce .env, yoksa istekteki token ile DB (API Ayarları).
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
 * @param {import('next').NextApiRequest} [req] - API route req (token Cookie veya Authorization ile)
 * @returns {Promise<{ sellerId: string, apiKey: string, apiSecret: string } | null>}
 */
export async function getPazaramaCredentials(req) {
  const key = process.env.PAZARAMA_API_KEY;
  const secret = process.env.PAZARAMA_API_SECRET;
  const sellerId = process.env.PAZARAMA_SELLER_ID;
  if (key && secret) {
    return {
      sellerId: (sellerId || "").trim(),
      apiKey: key.trim(),
      apiSecret: secret.trim(),
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
    const pz = doc?.pazarama || {};
    const apiKey = (pz.apiKey || "").trim();
    const apiSecret = (pz.apiSecret || "").trim();
    const sellerIdFromDb = (pz.sellerId || "").trim();
    if (apiKey && apiSecret) {
      return { sellerId: sellerIdFromDb, apiKey, apiSecret };
    }
  } catch (e) {
    // token geçersiz veya db hatası
  }
  return null;
}

/**
 * companyId ile Pazarama kimlik bilgilerini alır (multi-tenant, ortak stok sync için)
 * @param {string} companyId
 * @returns {Promise<{ apiKey: string, apiSecret: string } | null>}
 */
export async function getPazaramaCredentialsByCompany(companyId) {
  const key = process.env.PAZARAMA_API_KEY;
  const secret = process.env.PAZARAMA_API_SECRET;
  if (key && secret) {
    return { apiKey: key.trim(), apiSecret: secret.trim() };
  }

  const { connectToDatabase } = await import("@/lib/mongodb");
  const { db } = await connectToDatabase();
  const doc = await db.collection("settings").findOne({ companyId: String(companyId) });
  const pz = doc?.pazarama || {};
  const apiKey = (pz.apiKey || "").trim();
  const apiSecret = (pz.apiSecret || "").trim();
  if (apiKey && apiSecret) return { apiKey, apiSecret };
  return null;
}
