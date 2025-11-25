import axios from "axios";
import xml2js from "xml2js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Only GET allowed" });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "categoryId (id) zorunlu",
    });
  }

  const { N11_APP_KEY, N11_APP_SECRET } = process.env;

  const xml = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
      xmlns:sch="http://www.n11.com/ws/schemas">
      <soapenv:Header/>
      <soapenv:Body>
        <sch:GetSubCategoriesRequest>
          <auth>
            <appKey>${N11_APP_KEY}</appKey>
            <appSecret>${N11_APP_SECRET}</appSecret>
          </auth>
          <categoryId>${id}</categoryId>
        </sch:GetSubCategoriesRequest>
      </soapenv:Body>
    </soapenv:Envelope>
  `;

  try {
    const { data } = await axios.post(
      "https://api.n11.com/ws/CategoryService",
      xml,
      {
        headers: {
          "Content-Type": "text/xml;charset=UTF-8",
        },
      }
    );

    const parser = new xml2js.Parser({ explicitArray: false });
    const json = await parser.parseStringPromise(data);

    const raw =
      json?.Envelope?.Body?.GetSubCategoriesResponse?.categoryList?.category ||
      json?.["soapenv:Envelope"]?.["soapenv:Body"]?.[
        "ns3:GetSubCategoriesResponse"
      ]?.categoryList?.category ||
      [];

    const list = Array.isArray(raw) ? raw : [raw];

    return res.status(200).json({
      success: true,
      categories: list.map((c) => ({
        id: c.id,
        name: c.name,
        hasSub: !!c.subCategory,
      })),
    });
  } catch (err) {
    console.error("N11 SubCategory Error:", err.message);

    return res.status(500).json({
      success: false,
      message: "Alt kategori alınamadı",
      error: err.message,
    });
  }
}
