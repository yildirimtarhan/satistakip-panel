/**
 * Pazarama fiyat + stok toplu güncelleme
 * Hem updatePrice-v2 hem updateStock-v2 çağrılır
 * body: { items: [{ code, listPrice?, salePrice?, stockCount? }] }
 */
import jwt from "jsonwebtoken";
import { getPazaramaCredentials } from "@/lib/getPazaramaCredentials";
import { pazaramaUpdatePrice, pazaramaUpdateStock } from "@/lib/marketplaces/pazaramaService";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Sadece POST destekleniyor" });

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

  const items = req.body?.items ?? [];
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, error: "items dizisi zorunlu." });
  }

  const priceItems = items.filter(
    (it) => (it.code || it.barcode) && ((it.listPrice != null && it.listPrice > 0) || (it.salePrice != null && it.salePrice > 0))
  );
  const stockItems = items.filter((it) => (it.code || it.barcode) && (it.stockCount != null || it.stock != null));

  const results = { price: null, stock: null };
  const errors = [];

  try {
    if (priceItems.length > 0) {
      results.price = await pazaramaUpdatePrice(creds, priceItems);
      if (results.price?.success === false) {
        errors.push(results.price?.message || "Fiyat güncellemesi başarısız.");
      }
    }
    if (stockItems.length > 0) {
      results.stock = await pazaramaUpdateStock(creds, stockItems);
      if (results.stock?.success === false) {
        errors.push(results.stock?.message || "Stok güncellemesi başarısız.");
      }
    }
  } catch (err) {
    console.error("[Pazarama] Fiyat/Stok güncelleme:", err.message);
    return res.status(502).json({ success: false, error: err.message });
  }

  const success = errors.length === 0;
  let message = "";
  if (priceItems.length > 0 && stockItems.length > 0) {
    message = success ? "Fiyat ve stok güncellemeleri gönderildi." : errors.join(" ");
  } else if (priceItems.length > 0) {
    message = success ? "Fiyat güncellemeleri gönderildi." : errors.join(" ");
  } else if (stockItems.length > 0) {
    message = success ? "Stok güncellemeleri gönderildi." : errors.join(" ");
  } else {
    return res.status(400).json({
      success: false,
      error: "Güncellenecek fiyat veya stok bilgisi yok. listPrice, salePrice veya stockCount girin.",
    });
  }

  return res.status(200).json({
    success,
    data: results,
    message,
  });
}
