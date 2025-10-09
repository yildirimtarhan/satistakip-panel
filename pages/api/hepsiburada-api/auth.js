export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Yalnızca POST isteğine izin verilir" });
  }

  try {
    const { username, password, authenticationType } = req.body;

    console.log("📩 Gelen auth isteği:", req.body);

    const response = await fetch("https://mpop.hepsiburada.com/api/authenticate", {
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

    const text = await response.text();
    console.log("🌐 Hepsiburada ham yanıt:", text);

    try {
      const data = JSON.parse(text);
      return res.status(response.status).json(data);
    } catch {
      return res.status(response.status).json({
        message: "Hepsiburada yanıtı JSON formatında değil",
        raw: text,
      });
    }
  } catch (error) {
    console.error("❌ Sunucu hatası:", error);
    return res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
}
