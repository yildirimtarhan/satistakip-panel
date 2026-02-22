import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/mongodb";

export async function getN11SettingsFromRequest(req) {
  // ✅ FIX: req/headers güvenli oku (undefined patlamasın)
  const authHeader =
    req?.headers?.authorization ||
    req?.headers?.Authorization ||
    "";

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  if (!token) {
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
    return {
      source: "env",
      appKey: process.env.N11_APP_KEY || "",
      appSecret: process.env.N11_APP_SECRET || "",
      environment: process.env.N11_ENV || "production",
    };
  }

  const companyId = decoded.companyId || null;

  if (companyId) {
    try {
      const { db } = await connectToDatabase();
      const s = await db.collection("settings").findOne({ companyId });

      const appKey = s?.n11?.appKey || "";
      const appSecret = s?.n11?.appSecret || "";
      const environment = s?.n11?.environment || "production";

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

  return {
    source: "env",
    appKey: process.env.N11_APP_KEY || "",
    appSecret: process.env.N11_APP_SECRET || "",
    environment: process.env.N11_ENV || "production",
    companyId,
  };
}
