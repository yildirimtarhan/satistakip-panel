import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/mongodb";

export async function getN11SettingsFromRequest(req) {
  // 1) Token çöz
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  if (!token) {
    // Token yoksa sadece ENV fallback döneriz
    return {
      source: "env",
      appKey: process.env.N11_APP_KEY || "",
      appSecret: process.env.N11_APP_SECRET || "",
      environment: process.env.N11_ENV || "production",
    };
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) {
    // Token bozuksa yine ENV fallback
    return {
      source: "env",
      appKey: process.env.N11_APP_KEY || "",
      appSecret: process.env.N11_APP_SECRET || "",
      environment: process.env.N11_ENV || "production",
    };
  }

  const companyId = decoded.companyId || null;

  // 2) DB'den settings oku (multi-tenant)
  if (companyId) {
    try {
      const { db } = await connectToDatabase();
      const s = await db.collection("settings").findOne({ companyId });

      const appKey = s?.n11?.appKey || "";
      const appSecret = s?.n11?.appSecret || "";
      const environment = s?.n11?.environment || "production";

      // ✅ DB doluysa DB kullan
      if (appKey && appSecret) {
        return {
          source: "db",
          appKey,
          appSecret,
          environment,
          companyId,
        };
      }
    } catch (err) {
      console.log("N11 settings db read error:", err?.message || err);
    }
  }

  // 3) DB yoksa ENV fallback (canlı bozulmaz)
  return {
    source: "env",
    appKey: process.env.N11_APP_KEY || "",
    appSecret: process.env.N11_APP_SECRET || "",
    environment: process.env.N11_ENV || "production",
    companyId,
  };
}
