import axios from "axios";

const getN11TokenXML = () => `
<authRequest>
  <appKey>YOUR_APP_KEY</appKey>
  <appSecret>YOUR_APP_SECRET</appSecret>
</authRequest>
`;

export default async function handler(req, res) {
  try {
    const xml = getN11TokenXML();

    const response = await axios.post(
      "https://api.n11.com/ws/AuthService.wsdl",
      xml,
      {
        headers: {
          "Content-Type": "text/xml",
        },
      }
    );

    res.status(200).json({ response: response.data });
  } catch (error) {
    console.error("N11 API hatası:", error.message);
    res.status(500).json({ error: "N11 API bağlantı hatası" });
  }
}
