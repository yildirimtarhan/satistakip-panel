// pages/api/hepsiburada-api/orders/[id].js

export default async function handler(req, res) {
  const { id } = req.query; // Bu artık packageId olacak

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Sadece GET istekleri desteklenmektedir." });
  }

  const baseUrl = process.env.HEPSIBURADA_BASE_URL;
  const auth = process.env.HEPSIBURADA_AUTH;
  const userAgent = process.env.HEPSIBURADA_USER_AGENT;

  if (!baseUrl || !auth || !userAgent) {
    return res.status(500).json({ message: "Hepsiburada API environment değişkenleri eksik." });
  }

  try {
    const url = `${baseUrl}/packages/${id}`;
    console.log("📡 HB Tekil Paket Detay URL:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${auth}`,
        "User-Agent": userAgent,
        "Content-Type": "application/json",
      },
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!response.ok) {
      console.error("❌ Hepsiburada Tekil Paket API Hatası:", response.status, data);
      return res.status(response.status).json({
        message: "Paket detayları çekilemedi",
        status: response.status,
        error: data,
      });
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error("🔥 Sunucu Hatası /orders/[id]:", error);
    return res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
}
