import dbConnect from "@/lib/dbConnect";
import jwt from "jsonwebtoken";
import n11Service from "@/lib/marketplaces/n11Service";
import { getN11SettingsFromRequest } from "@/lib/n11Settings";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method Not Allowed",
    });
  }

  try {
    await dbConnect();

    /* =========================
       1️⃣ TOKEN → companyId
    ========================= */
    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({
        success: false,
        message: "No token",
      });
    }

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { companyId } = decoded;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "companyId bulunamadı",
      });
    }

    /* =========================
       2️⃣ N11 AYARLARI (settings)
    ========================= */
    const n11Settings = await getN11SettingsFromRequest(req);

    if (!n11Settings?.appKey || !n11Settings?.appSecret) {
      return res.status(400).json({
        success: false,
        message: "N11 ayarları bulunamadı",
      });
    }

    /* =========================
       3️⃣ N11 SOAP – GetProductList
       ⚠️ n11Service = DEFAULT EXPORT FUNCTION
    ========================= */
    const result = await n11Service({
      appKey: n11Settings.appKey,
      appSecret: n11Settings.appSecret,
      currentPage: 0,
      pageSize: 50,
    });

    /* =========================
       4️⃣ SOAP RESPONSE PARSE
    ========================= */
    let rawProducts = result?.products?.product || [];

    if (!Array.isArray(rawProducts)) {
      rawProducts = [rawProducts];
    }

    /* =========================
       5️⃣ UI FORMAT
    ========================= */
    const products = rawProducts.map((p) => ({
      n11ProductId: p.id,
      title: p.title,
      sellerCode: p.sellerCode,
      barcode: p.barcode,
      price: p.price,
      erpMatched: false,
      n11TaskStatus: "COMPLETED",
    }));

    return res.status(200).json({
      success: true,
      totalCount: result?.pagingData?.totalCount || products.length,
      products,
    });
  } catch (err) {
    console.error("N11 SYNC ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}
