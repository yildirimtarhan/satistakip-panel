/**
 * URL'den ürün sayfası meta bilgilerini çeker (og:title, og:description, og:image).
 * Link + kategori ile pazaryerine ürün yüklerken ön doldurma için kullanılır.
 */
import jwt from "jsonwebtoken";
import axios from "axios";

function extractMeta(html, url) {
  const result = { title: "", description: "", images: [] };
  if (!html || typeof html !== "string") return result;

  const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
  if (ogTitle) result.title = ogTitle[1].trim();

  const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:description["']/i);
  if (ogDesc) result.description = (ogDesc[1] || "").trim();

  const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
  if (ogImage) result.images.push(ogImage[1].trim());

  // Birden fazla og:image (bazı siteler)
  const allOgImages = html.matchAll(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/gi);
  for (const m of allOgImages) {
    const u = m[1].trim();
    if (u && !result.images.includes(u)) result.images.push(u);
  }
  if (result.images.length === 0) {
    const alt = html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image:url["']/i);
    if (alt) result.images.push(alt[1].trim());
  }

  // JSON-LD Product image
  const jsonLd = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonLd) {
    for (const block of jsonLd) {
      const inner = block.replace(/<\/?script[^>]*>/gi, "").trim();
      try {
        const data = JSON.parse(inner);
        const arr = Array.isArray(data) ? data : (data["@graph"] || [data]);
        for (const item of arr) {
          if (item["@type"] === "Product" && item.image) {
            const imgs = Array.isArray(item.image) ? item.image : [item.image];
            imgs.forEach((img) => {
              const u = typeof img === "string" ? img : (img?.url || "");
              if (u && u.startsWith("http") && !result.images.includes(u)) result.images.push(u);
            });
            if (!result.title && item.name) result.title = item.name;
            if (!result.description && item.description) result.description = item.description;
          }
        }
      } catch (_) {}
    }
  }

  return result;
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ success: false });
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ success: false, message: "Yetkisiz" });
    jwt.verify(token, process.env.JWT_SECRET);

    const url = req.method === "GET" ? req.query.url : req.body?.url;
    if (!url || !url.startsWith("http")) {
      return res.status(400).json({ success: false, message: "Geçerli bir URL girin (http/https)" });
    }

    const response = await axios.get(url, {
      timeout: 10000,
      maxRedirects: 5,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SatisTakip/1.0)" },
      responseType: "text",
      validateStatus: (s) => s >= 200 && s < 400,
    });

    const html = response.data;
    const data = extractMeta(html, url);
    return res.json({ success: true, ...data });
  } catch (err) {
    const status = err?.response?.status;
    if (status === 404) return res.status(404).json({ success: false, message: "Sayfa bulunamadı" });
    if (status >= 400) return res.status(502).json({ success: false, message: "URL’den veri alınamadı" });
    console.error("fetch-from-url:", err?.message);
    return res.status(500).json({ success: false, message: err?.message || "URL işlenemedi" });
  }
}
