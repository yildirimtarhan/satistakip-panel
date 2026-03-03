/**
 * Trendyol API bilgilerini alır: önce .env, yoksa istekteki token ile DB (API Ayarları).
 * Böylece .env.local'de Trendyol tanımlı olmadan sadece panelden girilen bilgiler kullanılabilir.
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
 * @returns {Promise<{ supplierId: string, apiKey: string, apiSecret: string } | null>}
 */
export async function getTrendyolCredentials(req) {
  const sid = process.env.TRENDYOL_SUPPLIER_ID;
  const key = process.env.TRENDYOL_API_KEY;
  const secret = process.env.TRENDYOL_API_SECRET;
  if (sid && key && secret) {
    return { supplierId: sid, apiKey: key, apiSecret: secret };
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
    const ty = doc?.trendyol || {};
    const supplierId = ty.supplierId || "";
    const apiKey = ty.apiKey || "";
    const apiSecret = ty.apiSecret || "";
    if (supplierId && apiKey && apiSecret) {
      return { supplierId, apiKey, apiSecret };
    }
  } catch (e) {
    // token geçersiz veya db hatası
  }
  return null;
}
