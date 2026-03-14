/**
 * Pazarama katalog ürün sorgusu (barkod veya ürün adına göre)
 */
import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import { pazaramaSearchCatalogProducts } from "@/lib/marketplaces/pazaramaService";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ message: "Sadece GET veya POST" });

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token gerekli" });

  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Geçersiz token" });
  }

  const creds = await getPazaramaCredentials(req);
  if (!creds?.apiKey || !creds?.apiSecret) {
    return res.status(400).json({ success: false, error: "Pazarama API bilgileri eksik." });
  }

  const params = req.method === "GET" ? req.query : (req.body || {});
  const { code = "", name = "", page = "1", size = "10" } = params;

  try {
    const data = await pazaramaSearchCatalogProducts(creds, {
      code: code.trim(),
      name: name.trim(),
      page: parseInt(page, 10) || 1,
      size: parseInt(size, 10) || 10,
    });
    return res.status(200).json({
      success: true,
      products: data?.data?.products ?? [],
      pageResponse: data?.data?.pageResponse ?? {},
    });
  } catch (err) {
    console.error("[Pazarama] Katalog sorgu hatası:", err.message);
    return res.status(502).json({ success: false, error: err.message });
  }
}
