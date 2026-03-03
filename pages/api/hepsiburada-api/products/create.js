// pages/api/hepsiburada-api/products/create.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Sadece POST istekleri desteklenmektedir." });
  }

  try {
    const authString = Buffer.from(
      `${process.env.HB_MERCHANT_ID}:${process.env.HB_SECRET_KEY}`
    ).toString("base64");

    const productData = req.body;
    const baseUrl = process.env.HEPSIBURADA_BASE_URL || process.env.HB_BASE_URL || "https://mpop-sit.hepsiburada.com";

    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/product/api/products`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authString}`,
        "User-Agent": process.env.HB_USER_AGENT,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(productData),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("🚨 Hepsiburada API ürün ekleme hatası:", data);
      return res.status(response.status).json({ error: data });
    }

    console.log("✅ Ürün başarıyla gönderildi:", data);
    return res.status(200).json(data);
  } catch (error) {
    console.error("🚨 Ürün ekleme işlemi başarısız:", error);
    return res.status(500).json({ error: error.message });
  }
}
