// pages/api/hepsiburada-api/auth.js

export default async function handler(req, res) {
  // ✅ Sadece POST isteğine izin veriyoruz
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Yalnızca POST isteğine izin verilir" });
  }

  try {
    let body = {};

    // 🧠 Bazı durumlarda Next.js body'i otomatik parse etmiyor. Elle parse ediyoruz.
    if (typeof req.body === "string") {
      body = JSON.parse(req.body);
    } else {
      body = req.body;
    }

    const { username, password, authenticationType } = body;

    console.log("📩 Gelen Body:", body);

    // 🛑 Zorunlu alan kontrolü
    if (!username || !password || !authenticationType) {
      return res.status(400).json({
        message: "Eksik alanlar var. Lütfen username, password ve authenticationType gönderin.",
        body
      });
    }

    // ✅ Hepsiburada'nın authenticate endpointine istek atıyoruz
    const authUrl = "https://mpop.hepsiburada.com/api/authenticate";
    const payload = {
      username,
      password,
      authenticationType
    };

    console.log("🚀 Hepsiburada Auth URL:", authUrl);

    const response = await fetch(authUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text(); // Hepsiburada bazen boş dönüyor
    console.log("📡 Hepsiburada API Yanıtı (Raw):", text);

    if (!response.ok) {
      return res.status(response.status).json({
        message: "Hepsiburada kimlik doğrulama başarısız",
        status: response.status,
        error: text,
      });
    }

    let data = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    // ✅ Başarılı ise token vs. döndür
    return res.status(200).json({
      message: "Hepsiburada kimlik doğrulama başarılı",
      data,
    });

  } catch (error) {
    console.error("❌ Sunucu hatası:", error);
    return res.status(500).json({
      message: "Sunucu hatası",
      error: error.message,
    });
  }
}
