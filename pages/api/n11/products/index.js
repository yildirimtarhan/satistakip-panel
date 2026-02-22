import jwt from "jsonwebtoken";
import axios from "axios";
import { getN11SettingsFromRequest } from "@/lib/n11Settings";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    /* =========================
       1️⃣ TOKEN → companyId
    ========================= */
    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({ message: "No token" });
    }

    const token = auth.split(" ")[1];
    jwt.verify(token, process.env.JWT_SECRET); // sadece doğrulama yeterli

    /* =========================
       2️⃣ N11 AYARLARI (settings collection)
    ========================= */
    const n11Settings = await getN11SettingsFromRequest(req);

    if (!n11Settings?.appKey || !n11Settings?.appSecret) {
      return res.status(400).json({
        message: "N11 ayarları bulunamadı",
      });
    }

    /* =========================
       3️⃣ PAGINATION PARAMS
    ========================= */
    const page = Number(req.query.page || 0);
    const size = Number(req.query.size || 50);

    /* =========================
       4️⃣ N11 REST – PRODUCT QUERY
       (Resmi endpoint)
    ========================= */
    const response = await axios.get(
      "https://api.n11.com/ms/product-query",
      {
        headers: {
          appkey: n11Settings.appKey,
          appsecret: n11Settings.appSecret,
          "Content-Type": "application/json",
        },
        params: {
          page,
          size,
        },
      }
    );

    const data = response.data;

    /* =========================
       5️⃣ RESPONSE NORMALIZE
    ========================= */
    const products = (data?.content || []).map((p) => ({
      n11ProductId: p.id,
      title: p.title,
      sellerCode: p.sellerCode,
      barcode: p.barcode,
      price: p.salePrice,
      stock: p.stockQuantity,
      status: p.approved ? "ACTIVE" : "PASSIVE",

      // ERP alanları (sonraki adımlar için)
      erpMatched: false,
    }));

    return res.status(200).json({
      success: true,
      page,
      size,
      totalElements: data?.totalElements || products.length,
      totalPages: data?.totalPages || 1,
      products,
    });
  } catch (err) {
    console.error("N11 REST PRODUCT ERROR:", err?.response?.data || err.message);
    return res.status(500).json({
      message: "N11 ürünleri alınamadı",
      error: err?.response?.data || err.message,
    });
  }
}
