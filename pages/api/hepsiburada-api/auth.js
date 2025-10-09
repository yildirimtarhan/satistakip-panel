// pages/api/hepsiburada-api/auth.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { username, password, authenticationType } = req.body;

  try {
    const hepsiRes = await fetch("https://mpop.hepsiburada.com/api/authenticate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, authenticationType }),
    });

    const data = await hepsiRes.json();

    if (!hepsiRes.ok) {
      console.error("❌ Hepsiburada Kimlik Doğrulama Hatası:", data);
      return res.status(hepsiRes.status).json({
        message: "Hepsiburada kimlik doğrulama başarısız",
        status: hepsiRes.status,
        error: data,
      });
    }

    console.log("✅ Hepsiburada Auth Başarılı:", data);
    return res.status(200).json(data);
  } catch (error) {
    console.error("❌ Sunucu Hatası:", error);
    return res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
}
