import axios from "axios";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Only GET allowed" });
  }

  try {
    const appKey = process.env.N11_APP_KEY;
    const appSecret = process.env.N11_APP_SECRET;

    if (!appKey || !appSecret) {
      return res.status(500).json({
        success: false,
        message: "N11 API bilgileri eksik. Lütfen .env'e ekleyin.",
      });
    }

    const response = await axios.post(
      "https://api.n11.com/rest/productService/productList",
      {},
      {
        auth: {
          username: appKey,
          password: appSecret,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "N11 ürün listesi başarıyla alındı.",
      products: response.data?.productList ?? [],
    });

  } catch (err) {
    console.error("N11 LIST ERROR:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: "N11 ürün listesi alınamadı",
      error: err.response?.data || err.message,
    });
  }
}
