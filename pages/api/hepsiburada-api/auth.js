export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Yalnızca POST isteğine izin verilir" });
  }

  const url = "https://mpop.hepsiburada.com/api/authenticate";

  const username = process.env.HEPSIBURADA_USERNAME;
  const password = process.env.HEPSIBURADA_PASSWORD;

  const bodyData = {
    username: username,
    password: password,
    authenticationType: "INTEGRATOR",
  };

  try {
    console.log("🔹 Hepsiburada Auth isteği gönderiliyor:", bodyData);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyData),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Auth hatası:", response.status, data);
      return res.status(response.status).json({
        message: "Hepsiburada kimlik doğrulama başarısız",
        status: response.status,
        error: data,
      });
    }

    console.log("✅ Hepsiburada Auth başarılı:", data);
    return res.status(200).json(data);

  } catch (error) {
    console.error("❌ Sunucu Hatası:", error);
    return res.status(500).json({
      message: "Sunucu hatası",
      error: error.message,
    });
  }
}
