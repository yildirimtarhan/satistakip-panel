// /pages/api/hepsiburada-api/auth.js

export default async function handler(req, res) {
  // 🔸 Sadece POST isteklerine izin veriyoruz
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // 🔸 Body bazen string olarak gelebilir, bu yüzden güvenli şekilde parse ediyoruz
    let bodyData = req.body;
    if (typeof bodyData === 'string') {
      try {
        bodyData = JSON.parse(bodyData);
      } catch (parseErr) {
        return res.status(400).json({ message: 'Geçersiz JSON formatı' });
      }
    }

    const { username, password } = bodyData || {};

    if (!username || !password) {
      return res.status(400).json({ message: 'Kullanıcı adı ve şifre zorunludur' });
    }

    // 🔸 Hepsiburada Auth isteği
    const response = await fetch('https://oms-external.hepsiburada.com/api/authenticate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Tigdes' // 📌 Canlı ortam User-Agent
      },
      body: JSON.stringify({
        username,
        password,
        authenticationType: 'INTEGRATOR' // 📌 Hepsiburada dökümanında isteniyor
      })
    });

    // 🔸 JSON olmayabilir, bu yüzden önce parse etmeyi deniyoruz
    let data;
    const rawText = await response.text();
    try {
      data = JSON.parse(rawText);
    } catch (jsonErr) {
      // JSON değilse raw text olarak döndür
      return res.status(response.status).json({
        message: 'Hepsiburada yanıtı JSON formatında değil',
        raw: rawText
      });
    }

    return res.status(response.status).json(data);

  } catch (error) {
    console.error('❌ Hepsiburada Auth API Hatası:', error);
    return res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
}
