import jwt from "jsonwebtoken";
import { getN11SettingsFromDB } from "@/lib/marketplaces/n11Service";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ success: false });

  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, message: "id zorunlu" });

  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyId = decoded?.companyId;
    const userId = decoded?.userId || decoded?.id || decoded?._id;

    const cfg = await getN11SettingsFromDB({ companyId, userId });

    // REST: GET https://api.n11.com/ms/category/{parentId}
    const response = await fetch(`https://api.n11.com/ms/category/${id}`, {
      headers: { appkey: cfg.appKey, appsecret: cfg.appSecret },
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(502).json({ success: false, message: "N11 yanıt vermedi", detail: text });
    }

    const data = await response.json();

    // N11 yanıtı: { categoryList: [...] } veya { content: [...] }
    const raw = data?.categoryList || data?.content || data?.categories || [];
    const list = Array.isArray(raw) ? raw : [raw].filter(Boolean);

    return res.status(200).json({
      success: true,
      categories: list.map((c) => ({
        id: c.id,
        name: c.name,
        hasSub: c.hasChildren || !!c.subCategory || false,
      })),
    });
  } catch (err) {
    console.error("N11 SubCategory Error:", err?.response?.data || err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
