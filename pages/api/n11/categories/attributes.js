import jwt from "jsonwebtoken";
import axios from "axios";
import { getN11SettingsFromDB } from "@/lib/marketplaces/n11Service";

const SOAP_URL = "https://api.n11.com/ws/CategoryService.wsdl";

async function soapPost(envelope, action, timeout = 15000) {
  const { data } = await axios.post(SOAP_URL, envelope, {
    headers: { "Content-Type": "text/xml;charset=utf-8", SOAPAction: action },
    timeout,
  });
  return data;
}

function parseCatAttrs(raw) {
  const attrBlocks = [...raw.matchAll(/<attribute>([\s\S]*?)<\/attribute>/g)];
  return attrBlocks.map((m) => {
    const block = m[1];
    const valueListStart = block.indexOf("<valueList>");
    const beforeValues = valueListStart >= 0 ? block.substring(0, valueListStart) : block;

    const id = beforeValues.match(/<id>(\d+)<\/id>/)?.[1];
    const name = beforeValues.match(/<name>([\s\S]*?)<\/name>/)?.[1]?.trim();
    const mandatory = beforeValues.includes("<mandatory>true</mandatory>");
    const allowCustom = beforeValues.includes("<customValue>true</customValue>");

    // Values from GetCategoryAttributes have only <name>, no <id>
    // Only use them for autocomplete hints when allowCustom=true
    const valueBlock = block.match(/<valueList>([\s\S]*?)<\/valueList>/)?.[1] || "";
    const hintValues = [...valueBlock.matchAll(/<value>([\s\S]*?)<\/value>/g)]
      .map((v) => v[1].match(/<name>([\s\S]*?)<\/name>/)?.[1]?.trim())
      .filter(Boolean);

    return { id, name, mandatory, allowCustom, hintValues, values: [] };
  }).filter((a) => a.id);
}

async function fetchAttrValues(appKey, appSecret, categoryId, attrId) {
  const env = `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://www.n11.com/ws/schemas"><soapenv:Header/><soapenv:Body><sch:GetCategoryAttributeValueRequest><auth><appKey>${appKey}</appKey><appSecret>${appSecret}</appSecret></auth><categoryId>${categoryId}</categoryId><categoryProductAttributeId>${attrId}</categoryProductAttributeId><pagingData><currentPage>0</currentPage><pageSize>200</pageSize></pagingData></sch:GetCategoryAttributeValueRequest></soapenv:Body></soapenv:Envelope>`;

  const data = await soapPost(env, "GetCategoryAttributeValue");
  const blocks = [...data.matchAll(/<categoryProductAttributeValue>([\s\S]*?)<\/categoryProductAttributeValue>/g)];
  return blocks.map((v) => ({
    id: v[1].match(/<id>(\d+)<\/id>/)?.[1],
    name: v[1].match(/<name>([\s\S]*?)<\/name>/)?.[1]?.trim(),
  })).filter((v) => v.id);
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

    // 1) Kategori attribute listesini al
    const attrsEnv = `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://www.n11.com/ws/schemas"><soapenv:Header/><soapenv:Body><sch:GetCategoryAttributesRequest><auth><appKey>${cfg.appKey}</appKey><appSecret>${cfg.appSecret}</appSecret></auth><categoryId>${categoryId}</categoryId></sch:GetCategoryAttributesRequest></soapenv:Body></soapenv:Envelope>`;

    const attrsRaw = await soapPost(attrsEnv, "GetCategoryAttributes");

    if (attrsRaw.includes("<status>failure</status>")) {
      const msg = attrsRaw.match(/<errorMessage>(.*?)<\/errorMessage>/)?.[1] || "Hata";
      return res.status(400).json({ success: false, message: msg });
    }

    const attributes = parseCatAttrs(attrsRaw);

    // 2) customValue=false olan attribute'lar için GetCategoryAttributeValue ile ID'li değerleri al
    await Promise.all(
      attributes
        .filter((a) => !a.allowCustom)
        .map(async (attr) => {
          try {
            const vals = await fetchAttrValues(cfg.appKey, cfg.appSecret, categoryId, attr.id);
            attr.values = vals;
          } catch {
            attr.values = [];
          }
        })
    );

    // 3) customValue=true olanlar için hintValues'u values olarak sun (dropdown önerisi)
    attributes.forEach((attr) => {
      if (attr.allowCustom && attr.hintValues.length > 0 && attr.values.length === 0) {
        attr.values = attr.hintValues.map((n) => ({ id: null, name: n }));
      }
    });

    return res.json({
      success: true,
      attributes,
      mandatory: attributes.filter((a) => a.mandatory),
      optional: attributes.filter((a) => !a.mandatory),
      ...(debug === "1" ? { rawXml: attrsRaw } : {}),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
