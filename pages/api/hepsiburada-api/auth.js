// /pages/api/hepsiburada-api/auth.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { username, password } = req.body;

    const response = await fetch('https://oms-external.hepsiburada.com/api/authenticate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'satistakip.online' // Hepsiburada burada User-Agent istiyor
      },
      body: JSON.stringify({
        username,
        password,
        authenticationType: 'INTEGRATOR' // 🔸 Eksik olan kısım buydu
      })
    });

    const data = await response.json();
    return res.status(response.status).json(data);

  } catch (error) {
    console.error('Hepsiburada API hatası:', error);
    return res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
}
