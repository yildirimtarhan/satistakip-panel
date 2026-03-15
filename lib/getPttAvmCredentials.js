/**
 * PTT AVM API bilgilerini alır: önce .env, yoksa istekteki token ile DB (API Ayarları).
 * Yeni entegrasyon: Api-Key + access-token (tedarikci.pttavm.com → Hesap Yönetimi → Entegrasyon Bilgileri)
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
 * @returns {Promise<{ apiKey: string, accessToken: string, storeName: string } | null>}
 */
export async function getPttAvmCredentials(req) {
  const apiKey = process.env.PTTAVM_API_KEY;
  const accessToken = process.env.PTTAVM_ACCESS_TOKEN;
  if (apiKey && accessToken) {
    return {
      apiKey: String(apiKey).trim(),
      accessToken: String(accessToken).trim(),
      storeName: (process.env.PTTAVM_STORE_NAME || "").trim(),
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
    const ptt = doc?.pttavm || {};
    const key = (ptt.apiKey || "").trim();
    const tok = (ptt.accessToken || "").trim();
    if (key && tok) {
      return {
        apiKey: key,
        accessToken: tok,
        storeName: (ptt.storeName || "").trim(),
      };
    }
  } catch (e) {
    // token geçersiz veya db hatası
  }
  return null;
}

/**
 * companyId ile PTT AVM kimlik bilgilerini alır (stok senkronu vb. için)
 * @param {string} companyId
 * @returns {Promise<{ apiKey: string, accessToken: string } | null>}
 */
export async function getPttAvmCredentialsByCompany(companyId) {
  const apiKey = process.env.PTTAVM_API_KEY;
  const accessToken = process.env.PTTAVM_ACCESS_TOKEN;
  if (apiKey && accessToken) {
    return { apiKey: String(apiKey).trim(), accessToken: String(accessToken).trim() };
  }

  const { connectToDatabase } = await import("@/lib/mongodb");
  const { db } = await connectToDatabase();
  const doc = await db.collection("settings").findOne({ companyId: String(companyId) });
  const ptt = doc?.pttavm || {};
  const key = (ptt.apiKey || "").trim();
  const tok = (ptt.accessToken || "").trim();
  if (key && tok) return { apiKey: key, accessToken: tok };
  return null;
}
