export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Yalnızca POST isteklerine izin verilir' });
  }

  try {
    const response = await fetch('https://mpop.hepsiburada.com/api/authenticate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Tigdes',
      },
      body: JSON.stringify({
        username: process.env.HEPSIBURADA_USERNAME,
        password: process.env.HEPSIBURADA_PASSWORD,
        authenticationType: 'INTEGRATOR',
      }),
    });

    const text = await response.text();

    try {
      const json = JSON.parse(text);
      return res.status(response.status).json(json);
    } catch (parseErr) {
      // JSON değilse ham metni geri döndürüyoruz
      return res.status(response.status).json({
        message: 'Hepsiburada yanıtı JSON formatında değil',
        raw: text,
      });
    }

  } catch (err) {
    console.error('Auth isteği sırasında hata:', err);
    return res.status(500).json({
      message: 'Sunucu hatası',
      error: err.message,
    });
  }
}
