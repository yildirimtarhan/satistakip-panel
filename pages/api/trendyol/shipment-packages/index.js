/**
 * GET: Kargo bekleyen paketleri listele (Created, Picking)
 * Trendyol getShipmentPackages veya orders API kullanır
 */
import { getTrendyolCredentials } from "@/lib/getTrendyolCredentials";
import { getShipmentPackagesUrl, ordersListUrl } from "@/lib/marketplaces/trendyolConfig";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Sadece GET" });
  }
  const creds = await getTrendyolCredentials(req);
  if (!creds) {
    return res.status(400).json({ success: false, message: "Trendyol API bilgileri eksik." });
  }
  const auth = Buffer.from(`${creds.apiKey}:${creds.apiSecret}`).toString("base64");
  const userAgent = process.env.TRENDYOL_USER_AGENT || "SatisTakip/1.0";
  const storeFrontCode = process.env.TRENDYOL_STORE_FRONT_CODE || "TR";
  const headers = {
    Authorization: `Basic ${auth}`,
    "User-Agent": userAgent,
    "Content-Type": "application/json",
    storeFrontCode,
  };

  const now = Date.now();
  const startDate = now - 30 * 24 * 60 * 60 * 1000;
  const endDate = now;

  try {
    // getShipmentPackages = GET /order/sellers/{id}/orders (status=Created,Picking)
    const pkgsUrl = `${getShipmentPackagesUrl(creds.supplierId)}?status=Created,Picking&startDate=${startDate}&endDate=${endDate}&size=50&orderByField=PackageLastModifiedDate&orderByDirection=DESC`;
    let r = await fetch(pkgsUrl, { method: "GET", headers });
    let data = await r.json().catch(() => ({}));
    let packages = [];

    if (r.ok && (data?.content || Array.isArray(data))) {
      packages = data.content || data;
    } else {
      // Fallback: orders API
      const ordersUrl = `${ordersListUrl(creds.supplierId)}?status=Created&startDate=${startDate}&endDate=${endDate}&size=50&orderByField=PackageLastModifiedDate&orderByDirection=DESC`;
      r = await fetch(ordersUrl, { method: "GET", headers });
      data = await r.json().catch(() => ({}));
      if (r.ok) {
        packages = data.content || data.orders || (Array.isArray(data) ? data : []);
      }
    }

    return res.status(200).json({
      success: true,
      packages: Array.isArray(packages) ? packages : [],
      totalElements: data?.totalElements ?? packages?.length ?? 0,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
