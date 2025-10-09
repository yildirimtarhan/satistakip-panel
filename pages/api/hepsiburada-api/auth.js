export const config = {
  api: {
    bodyParser: true, // JSON verisini düzgün alabilmek için önemli!
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Yalnızca POST isteğine izin verilir" });
  }

  try {
    const { username, password, authenticationType } = req.body;

    // JSON body düzgün gelmezse burası hatayı gösterecek
    if (!username || !password || !authenticationType) {
      console.log("❌ Gelen veri eksik veya boş:", req.body);
      return res.status(400).json({
        message: "Eksik veya geçersiz alanlar",
        received: req.body,
      });
    }

    // 🔸 Hepsiburada canlı auth endpoint
    const hepsiburadaUrl = "https://mpop.hepsiburada.com/api/authenticate";

    console.log("🟡 Hepsiburada'ya gönderilen veri:", { username, password, authenticationType });

    const response = await fetch(hepsiburadaUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password, authenticationType }),
    });

    const text = await response.text(); // önce text alıyoruz
    console.log("🟢 Hepsiburada raw response:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch (jsonErr) {
      console.error("❌ JSON parse hatası:", jsonErr);
      return res.status(500).json({
        message: "Hepsiburada yanıtı JSON formatında değil",
        raw: text,
      });
    }

    return res.status(response.status).json(data);
  } catch (error) {
    console.error("🔴 Sunucu hatası:", error);
    return res.status(500).json({
      message: "Sunucu hatası",
      error: error.message,
    });
  }
}
