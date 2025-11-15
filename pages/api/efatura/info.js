// 📁 /pages/api/efatura/info.js

/**
 * Bu API şu an MOCK modundadır.
 * Entegratör API erişimi geldiğinde sadece şu satır değişecek:
 * const result = await entegratorClient.checkCustomer(vknTckn);
 */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST desteklenir" });
  }

  try {
    const { vknTckn } = req.body;

    if (!vknTckn) {
      return res.status(400).json({ message: "VKN/TCKN gerekli" });
    }

    const cleaned = String(vknTckn).replace(/\D/g, "");

    if (![10, 11].includes(cleaned.length)) {
      return res.status(400).json({ message: "Geçersiz VKN/TCKN" });
    }

    // -------------------------------------------------
    // 🎯 MOCK CEVAP (entegratör API geldiğinde değişecek)
    // -------------------------------------------------

    let result = {
      type: "earsiv",
      title: "E-Arşiv Kullanıcısı",
      vknTckn: cleaned,
      status: true
    };

    // Basit test mantığı
    if (cleaned.startsWith("1")) {
      result = {
        type: "efatura",
        title: "E-Fatura Mükellefi",
        vknTckn: cleaned,
        status: true
      };
    }

    if (cleaned.endsWith("5")) {
      result = {
        type: "none",
        title: "Mükellef Bulunamadı",
        vknTckn: cleaned,
        status: false
      };
    }

    return res.status(200).json(result);

  } catch (err) {
    console.error("📌 E-Fatura bilgisi sorgulama hatası:", err);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
