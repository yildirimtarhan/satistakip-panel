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

    const { categoryId } = req.query;
    if (!categoryId) {
      return res.status(200).json({ success: true, brands: [], count: 0 });
    }

    // REST: GET https://api.n11.com/cdn/category/{categoryId}/attribute
    const response = await fetch(
      `https://api.n11.com/cdn/category/${categoryId}/attribute`,
      { headers: { appkey: cfg.appKey, appsecret: cfg.appSecret } }
    );

    if (!response.ok) {
      const text = await response.text();
      return res.status(502).json({ success: false, message: "N11 brand API hata", detail: text });
    }

    const data = await response.json();

    const attrs = data?.categoryAttributes || [];
    console.log("[N11 Brands] attrs count:", attrs.length);
    if (attrs[0]) console.log("[N11 Brands] first attr keys:", Object.keys(attrs[0]));

    // N11 CDN farklı field adları kullanabiliyor: attributeName veya name
    const markaAttr = attrs.find((a) => {
      const attrName = (a?.attributeName || a?.name || a?.attribute?.name || "").toLowerCase();
      return attrName === "marka" || attrName === "brand";
    });

    // Değerler: attributeValues veya values veya attributeValue
    const rawValues =
      markaAttr?.attributeValues ||
      markaAttr?.values ||
      markaAttr?.attributeValue ||
      [];

    console.log("[N11 Brands] markaAttr found:", !!markaAttr, "| values count:", rawValues.length);
    if (rawValues[0]) console.log("[N11 Brands] sample value:", JSON.stringify(rawValues[0]));

    const brands = rawValues.map((b) => ({
      id: b.id,
      name: b.value ?? b.name ?? b.label ?? b.attributeValue ?? String(b.id),
    }));

    return res.status(200).json({ success: true, brands, count: brands.length });
  } catch (err) {
    console.error("N11 Brands Error:", err?.response?.data || err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
