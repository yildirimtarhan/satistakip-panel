export default async function handler(req, res) {
  try {
    const baseUrl = process.env.HEPSIBURADA_BASE_URL;
    const merchantId = process.env.HEPSIBURADA_MERCHANT_ID;
    const auth = process.env.HEPSIBURADA_AUTH;
    const userAgent = process.env.HEPSIBURADA_USER_AGENT;

    if (!baseUrl || !merchantId || !auth || !userAgent) {
      return res.status(500).json({ message: "Eksik environment değişkeni" });
    }

    // ✅ /api varsa otomatik kaldır
    const cleanBase = baseUrl.replace(/\/api$/, "");
    const url = `${cleanBase}/listings/merchantid/${merchantId}/products`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${auth}`,
        "User-Agent": userAgent,
        "Content-Type": "application/json",
      },
    });

    const raw = await response.text();

    return res.status(200).json({
      status: response.status,
      ok: response.ok,
      message: response.ok
        ? "✅ Bağlantı başarılı"
        : "❌ Hepsiburada API hatası",
      raw,
    });
  } catch (err) {
    console.error("🔥 Hepsiburada bağlantı testi hatası:", err);
    return res.status(500).json({
      message: "Sunucu hatası",
      error: err.message,
    });
  }
}
