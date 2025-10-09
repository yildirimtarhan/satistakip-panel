export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Yalnızca POST isteğine izin verilir" });
  }

  const url = "https://mpop.hepsiburada.com/api/authenticate";
  const { username, password } = {
    username: process.env.HEPSIBURADA_USERNAME,
    password: process.env.HEPSIBURADA_PASSWORD,
  };

  const payload = {
    username: username,
    password: password,
    authenticationType: "INTEGRATOR",
  };

  try {
    console.log("🔸 Auth isteği gönderiliyor:", payload);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": process.env.HEPSIBURADA_USER_AGENT || "Tigdes",
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    console.log("🔸 Hepsiburada ham yanıt:", text);

    try {
      const data = JSON.parse(text);
      return res.status(response.status).json(data);
    } catch (e) {
      console.error("⚠️ Yanıt JSON formatında değil:", text);
      return res.status(response.status).json({
        message: "Hepsiburada yanıtı JSON formatında değil",
        raw: text,
      });
    }
  } catch (error) {
    console.error("❌ Sunucu hatası:", error);
    return res.status(500).json({
      message: "Sunucu hatası",
      error: error.message,
    });
  }
}
