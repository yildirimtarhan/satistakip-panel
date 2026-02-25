import jwt from "jsonwebtoken";
import axios from "axios";
import { getN11SettingsFromDB } from "@/lib/marketplaces/n11Service";

const SOAP_URL = "https://api.n11.com/ws/CategoryService.wsdl";

function parseCatAttrs(raw) {
  const matches = [...raw.matchAll(/<attribute>([\s\S]*?)<\/attribute>/g)];
  return matches.map((m) => {
    const id = m[1].match(/<id>(\d+)<\/id>/)?.[1];
    const name = m[1].match(/<name>(.*?)<\/name>/)?.[1];
    const mandatory = m[1].match(/<mandatory>(.*?)<\/mandatory>/)?.[1] === "true";
    const valMatches = [...m[1].matchAll(/<value>[\s\S]*?<id>(\d+)<\/id>[\s\S]*?<name>(.*?)<\/name>[\s\S]*?<\/value>/g)];
    return {
      id,
      name,
      mandatory,
      values: valMatches.map((v) => ({ id: v[1], name: v[2] })),
    };
  });
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ success: false });
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyId = decoded?.companyId;
    const userId = decoded?.userId || decoded?.id || decoded?._id;
    const cfg = await getN11SettingsFromDB({ companyId, userId });

    const { categoryId } = req.query;
    if (!categoryId) return res.status(400).json({ success: false, message: "categoryId gerekli" });

    const env = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://www.n11.com/ws/schemas">
  <soapenv:Header/>
  <soapenv:Body>
    <sch:GetCategoryAttributesRequest>
      <auth><appKey>${cfg.appKey}</appKey><appSecret>${cfg.appSecret}</appSecret></auth>
      <categoryId>${categoryId}</categoryId>
    </sch:GetCategoryAttributesRequest>
  </soapenv:Body>
</soapenv:Envelope>`;

    const { data } = await axios.post(SOAP_URL, env, {
      headers: { "Content-Type": "text/xml;charset=utf-8", SOAPAction: "GetCategoryAttributes" },
      timeout: 10000,
    });

    if (data.includes("<status>failure</status>")) {
      const msg = data.match(/<errorMessage>(.*?)<\/errorMessage>/)?.[1] || "Hata";
      return res.status(400).json({ success: false, message: msg });
    }

    const attributes = parseCatAttrs(data);
    return res.json({
      success: true,
      attributes,
      mandatory: attributes.filter((a) => a.mandatory),
      optional: attributes.filter((a) => !a.mandatory),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
