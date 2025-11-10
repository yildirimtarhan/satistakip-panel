import axios from "axios";

export default async function handler(req, res) {
  const { N11_API_KEY, N11_API_SECRET } = process.env;
  const url = "https://api.n11.com/ws/AuthenticationService.wsdl";

  try {
    const xmlRequest = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                        xmlns:sch="http://www.n11.com/ws/schemas">
        <soapenv:Header/>
        <soapenv:Body>
          <sch:AuthenticationRequest>
            <appKey>${N11_API_KEY}</appKey>
            <appSecret>${N11_API_SECRET}</appSecret>
          </sch:AuthenticationRequest>
        </soapenv:Body>
      </soapenv:Envelope>
    `;

    const { data } = await axios.post(url, xmlRequest, {
      headers: { "Content-Type": "text/xml;charset=UTF-8" },
    });

    if (data.includes("<status>success</status>")) {
      return res.status(200).json({
        success: true,
        message: "✅ API kimlik doğrulaması başarılı!",
      });
    } else {
      return res.status(401).json({
        success: false,
        message: "❌ API kimlik doğrulaması başarısız!",
        raw: data.slice(0, 300),
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Bağlantı hatası",
      error: error.message,
    });
  }
}
