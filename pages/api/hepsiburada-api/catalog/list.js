/**
 * Hepsiburada'dan ürün listesi çekme (Statü bazlı)
 * GET ?productStatus=MATCHED&page=0&size=50
 * Doküman: https://developers.hepsiburada.com/hepsiburada/reference/getproductbymerchantidandstatus
 */
import {
  getHepsiburadaMerchantId,
  getHepsiburadaAuth,
  getHepsiburadaUserAgent,
  getHepsiburadaMpopBaseUrl,
} from "@/lib/hepsiburadaEnv";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Yalnızca GET" });
  }

  const merchantId = getHepsiburadaMerchantId();
  const auth = getHepsiburadaAuth();
  const userAgent = getHepsiburadaUserAgent();

  if (!merchantId || !auth) {
    return res.status(400).json({
      success: false,
      message: "HEPSIBURADA_MERCHANT_ID ve HEPSIBURADA_AUTH (veya HB_*) tanımlı değil",
    });
  }

  const productStatus = req.query.productStatus || "MATCHED";
  const page = Math.max(0, parseInt(req.query.page, 10) || 0);
  const size = Math.min(100, Math.max(1, parseInt(req.query.size, 10) || 20));

  const baseUrl = getHepsiburadaMpopBaseUrl();
  const url = `${baseUrl}/product/api/products/products-by-merchant-and-status?merchantId=${encodeURIComponent(merchantId)}&productStatus=${encodeURIComponent(productStatus)}&page=${page}&size=${size}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: auth,
        "User-Agent": userAgent,
        Accept: "application/json",
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: data?.message || "Hepsiburada API hatası",
        raw: data,
      });
    }

    return res.status(200).json({
      success: true,
      totalElements: data.totalElements ?? 0,
      totalPages: data.totalPages ?? 0,
      number: data.number ?? page,
      data: data.data ?? [],
    });
  } catch (err) {
    console.error("HB catalog list error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
