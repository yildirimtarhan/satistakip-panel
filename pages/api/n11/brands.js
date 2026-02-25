import jwt from "jsonwebtoken";
import { getN11SettingsFromDB } from "@/lib/marketplaces/n11Service";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ success: false });

  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyId = decoded?.companyId;
    const userId = decoded?.userId || decoded?.id || decoded?._id;

    const cfg = await getN11SettingsFromDB({ companyId, userId });

    const { categoryId, debug } = req.query;
    if (!categoryId) {
      return res.status(200).json({ success: true, brands: [], count: 0 });
    }

    // N11 CDN endpoint — auth header'sız ve auth header'lı iki deneme
    const endpoints = [
      `https://api.n11.com/cdn/category/${categoryId}/attribute`,
      `https://api.n11.com/ms/catalog/category/${categoryId}/attribute`,
    ];

    let data = null;
    let lastError = null;

    for (const url of endpoints) {
      try {
        // Önce auth'suz dene (CDN public olabilir)
        let response = await fetch(url, { headers: { "Content-Type": "application/json" } });
        if (!response.ok) {
          // Auth ile dene
          response = await fetch(url, {
            headers: {
              "Content-Type": "application/json",
              appKey: cfg.appKey,
              appSecret: cfg.appSecret,
              appkey: cfg.appKey,
              appsecret: cfg.appSecret,
            },
          });
        }
        if (response.ok) {
          data = await response.json();
          console.log("[N11 Brands] URL:", url);
          console.log("[N11 Brands] Raw top-level keys:", Object.keys(data || {}));
          break;
        }
      } catch (e) {
        lastError = e;
      }
    }

    if (!data) {
      return res.status(502).json({ success: false, message: "N11 brand API ulaşılamadı", error: lastError?.message });
    }

    // Debug mod: ham veriyi döndür
    if (debug === "1") {
      return res.json({ success: true, raw: data });
    }

    // Farklı response yapılarını dene
    const attrs =
      data?.categoryAttributes ||
      data?.attributes ||
      data?.data?.categoryAttributes ||
      data?.data?.attributes ||
      data?.result?.categoryAttributes ||
      (Array.isArray(data) ? data : []);

    console.log("[N11 Brands] attrs count:", attrs.length);
    if (attrs[0]) console.log("[N11 Brands] first attr sample:", JSON.stringify(attrs[0]).substring(0, 300));

    // Marka attribute'u bul
    const markaAttr = attrs.find((a) => {
      const n = (
        a?.attributeName ||
        a?.name ||
        a?.attribute?.name ||
        a?.displayName ||
        ""
      ).toLowerCase();
      return n === "marka" || n === "brand" || n.includes("marka");
    });

    if (!markaAttr && attrs.length > 0) {
      // Marka bulunamadıysa tüm attribute isimlerini logla
      console.log("[N11 Brands] Available attr names:", attrs.map((a) => a?.attributeName || a?.name || a?.attribute?.name || "?").join(", "));
    }

    // Değerleri al
    const rawValues =
      markaAttr?.attributeValues ||
      markaAttr?.values ||
      markaAttr?.attributeValue ||
      markaAttr?.options ||
      [];

    console.log("[N11 Brands] markaAttr:", markaAttr?.attributeName || markaAttr?.name || "bulunamadı", "| values:", rawValues.length);
    if (rawValues[0]) console.log("[N11 Brands] sample value:", JSON.stringify(rawValues[0]));

    const brands = rawValues.map((b) => ({
      id: b?.id ?? b?.attributeValueId ?? b?.valueId,
      name: b?.value ?? b?.name ?? b?.label ?? b?.attributeValue ?? b?.text ?? String(b?.id ?? ""),
    })).filter((b) => b.id);

    return res.status(200).json({ success: true, brands, count: brands.length });
  } catch (err) {
    console.error("N11 Brands Error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
