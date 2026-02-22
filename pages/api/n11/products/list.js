import jwt from "jsonwebtoken";
import dbConnect from "@/lib/mongodb";
import Settings from "@/models/Settings";

export default async function handler(req, res) {
  try {
    await dbConnect();

    if (req.method !== "GET") {
      return res.status(405).json({
        success: false,
        message: "Method Not Allowed",
      });
    }

    // ✅ Token kontrol
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token eksik",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Token geçersiz",
      });
    }

    const companyId = decoded.companyId;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "companyId bulunamadı",
      });
    }

    // ✅ Settings DB’den çek (multi-tenant)
    const settings = await Settings.findOne({ companyId });

    const n11 = settings?.n11 || {};
    const appKey = n11?.appKey || process.env.N11_APP_KEY;
    const appSecret = n11?.appSecret || process.env.N11_APP_SECRET;
    const environment =
      n11?.environment || process.env.N11_ENVIRONMENT || "production";

    if (!appKey || !appSecret) {
      return res.status(400).json({
        success: false,
        message: "N11 API Key / Secret eksik",
      });
    }

    // ✅ WSDL seç
    const url =
      environment === "sandbox"
        ? "https://api.n11.com/ws/ProductService.wsdl"
        : "https://api.n11.com/ws/ProductService.wsdl";

    // ✅ FIX: soap import problemi (Next.js’de en sağlam yöntem)
    const soap = require("soap");
    const client = await soap.createClientAsync(url);

    const requestData = {
      auth: { appKey, appSecret },
      pagingData: { currentPage: 0, pageSize: 50 },
    };

    const [result] = await client.GetProductListAsync(requestData);

    return res.status(200).json({
      success: true,
      message: "N11 ürünleri getirildi",
      data: result,
      source: "db",
      environment,
    });
  } catch (error) {
    console.error("N11 PRODUCT LIST ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "N11 ürünleri alınamadı",
    });
  }
}
