// /pages/api/hepsiburada-api/auth.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Yalnızca POST isteğine izin verilir" });
  }

  const { username, password, authenticationType } = req.body;

  if (!username || !password || !authenticationType) {
    return res.status(400).json({ message: "Eksik bilgi gönderildi" });
  }

  try {
    // 🔗 Hepsiburada Auth endpoint (canlı)
    const authUrl = "https://mpop.hepsiburada.com/api/authenticate";

    const hbResponse = await fetch(authUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Tigdes", // zorunlu user-agent
      },
      body: JSON.stringify({
        username,
        password,
        authenticationType,
      }),
    });

    // 🧩 Yanıtı önce ham metin olarak al
    const rawText = await hbResponse.text();

    // 🔍 JSON'a çevirmeyi dene
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      console.error("Hepsiburada JSON parse hatası:", rawText);
      return res.status(400).json({
        message: "Hepsiburada yanıtı JSON formatında değil",
        raw: rawText,
      });
    }

    // ✅ Başarılıysa döndür
    return res.status(hbResponse.status).json(data);
  } catch (error) {
    console.error("Auth Hatası:", error);
    return res.status(500).json({
      message: "Sunucu hatası",
      error: error.message,
    });
  }
}
