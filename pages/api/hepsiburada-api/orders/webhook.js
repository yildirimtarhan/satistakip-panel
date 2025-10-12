// pages/api/hepsiburada-api/orders/webhook.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST istekleri desteklenmektedir." });
  }

  try {
    const payload = req.body;
    console.log("📬 Hepsiburada Webhook Payload:", JSON.stringify(payload, null, 2));

    if (payload && payload.orderNumber) {
      console.log(`✅ Yeni sipariş bildirimi alındı: ${payload.orderNumber}`);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Webhook işlenirken hata:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
};
