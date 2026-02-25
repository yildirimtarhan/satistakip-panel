import jwt from "jsonwebtoken";
import axios from "axios";
import { getN11SettingsFromDB } from "@/lib/marketplaces/n11Service";

const SOAP_URL = "https://api.n11.com/ws/CategoryService.wsdl";

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : null;
}

function parseCatAttrs(raw) {
  // Extract all <attribute> blocks
  const attrBlocks = [...raw.matchAll(/<attribute>([\s\S]*?)<\/attribute>/g)];

  return attrBlocks.map((m) => {
    const block = m[1];

    // Attribute-level fields are the FIRST occurrences (before any <value> blocks)
    const valueListStart = block.indexOf("<valueList>");
    const beforeValues = valueListStart >= 0 ? block.substring(0, valueListStart) : block;

    const id = beforeValues.match(/<id>(\d+)<\/id>/)?.[1];
    const name = beforeValues.match(/<name>([\s\S]*?)<\/name>/)?.[1]?.trim();
    const mandatory = beforeValues.match(/<mandatory>(true|false)<\/mandatory>/)?.[1] === "true";

    // Parse values from <valueList>
    let values = [];
    const valueListBlock = block.match(/<valueList>([\s\S]*?)<\/valueList>/)?.[1] || "";
    const valueBlocks = [...valueListBlock.matchAll(/<value>([\s\S]*?)<\/value>/g)];
    values = valueBlocks.map((v) => {
      const vid = v[1].match(/<id>(\d+)<\/id>/)?.[1];
      const vname = v[1].match(/<name>([\s\S]*?)<\/name>/)?.[1]?.trim();
      return { id: vid, name: vname };
    }).filter((v) => v.id);

    return { id, name, mandatory, values };
  }).filter((a) => a.id);
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ success: false });
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyId = decoded?.companyId;
    const userId = decoded?.userId || decoded?.id || decoded?._id;
    const cfg = await getN11SettingsFromDB({ companyId, userId });

    const { categoryId, debug } = req.query;
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
      timeout: 15000,
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
      ...(debug === "1" ? { rawXml: data } : {}),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
