// pages/api/hepsiburada-api/auth.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Yalnızca POST isteğine izin verilir" });
  }

  try {
    const { username, password, authenticationType } = req.body;

    if (!username || !password || !authenticationType) {
      return res.status(400).json({ message: "Eksik bilgi gönderildi" });
    }

    const authUrl = "https://oms-external.hepsiburada.com/api/authenticate"; // Hepsiburada canlı endpoint

    const response = await fetch(authUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "tigdes_dev", // Hepsiburada'nın istediği user-agent
      },
      body: JSON.stringify({
        username,
        password,
        authenticationType,
      }),
    });

    const rawText = await response.text();
    console.log("Hepsiburada RAW yanıt:", rawText); // Log alıyoruz

    try {
      const json = JSON.parse(rawText);
      return res.status(response.status).json(json);
    } catch (jsonErr) {
      return res.status(response.status).json({
        message: "Hepsiburada yanıtı JSON formatında değil",
        raw: rawText,
      });
    }
  } catch (err) {
    console.error("Sunucu hatası:", err);
    return res.status(500).json({
      message: "Sunucu hatası",
      error: err.message,
    });
  }
}
