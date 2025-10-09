// pages/api/hepsiburada-api/auth.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    // ✅ JSON body'yi düzgün oku
    const { username, password, authenticationType } = req.body || {};

    if (!username || !password || !authenticationType) {
      return res.status(400).json({ message: "Eksik alanlar var" });
    }

    // ✅ Hepsiburada Auth endpoint (canlı)
    const authUrl = "https://mpop.hepsiburada.com/api/authenticate";

    // ✅ İstek at
    const hbRes = await fetch(authUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
        authenticationType,
      }),
    });

    const hbData = await hbRes.json();

    if (!hbRes.ok) {
      console.error("❌ Hepsiburada kimlik doğrulama başarısız:", hbData);
      return res.status(hbRes.status).json({
        message: "Hepsiburada kimlik doğrulama başarısız",
        status: hbRes.status,
        error: hbData,
      });
    }

    console.log("✅ Hepsiburada token yanıtı:", hbData);
    return res.status(200).json(hbData);

  } catch (error) {
    console.error("❌ Sunucu Hatası:", error);
    return res.status(500).json({
      message: "Sunucu hatası",
      error: error.message,
    });
  }
}
