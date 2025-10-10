export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    let bodyData = req.body;
    if (typeof bodyData === 'string') {
      try {
        bodyData = JSON.parse(bodyData);
      } catch {
        return res.status(400).json({ message: 'Geçersiz JSON formatı' });
      }
    }

    const { username, password } = bodyData || {};

    if (!username || !password) {
      return res.status(400).json({ message: 'Kullanıcı adı ve şifre zorunludur' });
    }

    const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');

    console.log('📤 Gönderilen Basic Auth:', basicAuth);

    const response = await fetch('https://oms-external.hepsiburada.com/api/authenticate', {
      method: 'GET', // Hepsiburada Basic Auth endpoint genellikle GET ile çalışır
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'User-Agent': 'Tigdes',
        'Accept': 'application/json'
      }
    });

    const rawText = await response.text();
    console.log('📥 Yanıt status:', response.status);
    console.log('📥 Yanıt text:', rawText);

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
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
