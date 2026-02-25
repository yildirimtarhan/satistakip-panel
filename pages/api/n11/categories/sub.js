import jwt from "jsonwebtoken";
import axios from "axios";
import { getN11SettingsFromDB } from "@/lib/marketplaces/n11Service";

const SOAP_URL = "https://api.n11.com/ws/CategoryService.wsdl";

function parseSubCats(raw) {
  const matches = [...raw.matchAll(/<subCategory>([\s\S]*?)<\/subCategory>/g)];
  return matches.map((m) => {
    const id = m[1].match(/<id>(\d+)<\/id>/)?.[1];
    const name = m[1].match(/<name>(.*?)<\/name>/)?.[1]?.replace(/&amp;/g, "&");
    return { id, name };
  });
}

async function soapRaw(action, bodyXml, cfg) {
  const env = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://www.n11.com/ws/schemas">
  <soapenv:Header/><soapenv:Body>${bodyXml}</soapenv:Body>
</soapenv:Envelope>`;
  const { data } = await axios.post(SOAP_URL, env, {
    headers: { "Content-Type": "text/xml;charset=utf-8", SOAPAction: action },
    timeout: 10000,
  });
  return data;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ success: false });
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyId = decoded?.companyId;
    const userId = decoded?.userId || decoded?.id || decoded?._id;
    const cfg = await getN11SettingsFromDB({ companyId, userId });

    const { id } = req.query;
    if (!id) return res.status(400).json({ success: false, message: "id gerekli" });

    const raw = await soapRaw(
      "GetSubCategories",
      `<sch:GetSubCategoriesRequest>
        <auth><appKey>${cfg.appKey}</appKey><appSecret>${cfg.appSecret}</appSecret></auth>
        <categoryId>${id}</categoryId>
      </sch:GetSubCategoriesRequest>`,
      cfg
    );

    if (raw.includes("<status>failure</status>")) {
      const msg = raw.match(/<errorMessage>(.*?)<\/errorMessage>/)?.[1] || "Hata";
      return res.status(400).json({ success: false, message: msg });
    }

    const subs = parseSubCats(raw);
    return res.json({ success: true, subCategories: subs, count: subs.length });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
