import dbConnect from "@/lib/mongodb";
import N11Brand from "@/models/N11Brand";
import axios from "axios";
import xml2js from "xml2js";

const BRAND_URL = "https://api.n11.com/ws/CategoryService.svc";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Only GET allowed" });
  }

  const APP_KEY = process.env.N11_APP_KEY;
  const APP_SECRET = process.env.N11_APP_SECRET;

  await dbConnect();

  try {
    const xml = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
        xmlns:sch="http://www.n11.com/ws/schemas">
        <soapenv:Header/>
        <soapenv:Body>
          <sch:GetBrandListRequest>
            <auth>
              <appKey>${APP_KEY}</appKey>
              <appSecret>${APP_SECRET}</appSecret>
            </auth>
          </sch:GetBrandListRequest>
        </soapenv:Body>
      </soapenv:Envelope>`;

    const response = await axios.post(BRAND_URL, xml, {
      headers: { "Content-Type": "text/xml;charset=UTF-8" },
    });

    const parsed = await xml2js.parseStringPromise(response.data, {
      explicitArray: false,
    });

    const brands =
      parsed["s:Envelope"]["s:Body"].GetBrandListResponse.brandList.brand;

    await N11Brand.deleteMany({});
    await N11Brand.insertMany(
      brands.map((b) => ({
        id: Number(b.id),
        name: b.name,
      }))
    );

    return res.json({
      success: true,
      count: brands.length,
      message: "N11 marka listesi ERP'ye kaydedildi",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}
