import { getIdefixCredentials } from "@/lib/getIdefixCredentials";
import { idefixGetProductCategories } from "@/lib/marketplaces/idefixService";

/**
 * GET: İdefix kategori listesi (product-category)
 * Ürün create isteklerinde kullanılacak categoryId değerleri buradan alınır.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET destekleniyor" });
  }

  const creds = await getIdefixCredentials(req);
  if (!creds?.apiKey || !creds?.apiSecret) {
    return res.status(400).json({
      success: false,
      message: "İdefix API bilgileri eksik. API Ayarları → İdefix.",
      categories: [],
    });
  }

  try {
    const categories = await idefixGetProductCategories(creds);
    return res.status(200).json({
      success: true,
      categories,
    });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return res.status(err.response?.status === 401 ? 401 : 500).json({
      success: false,
      message: String(msg).slice(0, 300),
      categories: [],
    });
  }
}
