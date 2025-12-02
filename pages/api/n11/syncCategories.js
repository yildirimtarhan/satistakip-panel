import dbConnect from "@/lib/mongodb";
import N11Category from "@/models/N11Category";
import axios from "axios";
import xml2js from "xml2js";

const CATEGORY_URL = "https://api.n11.com/ws/CategoryService.svc";

async function soapRequest(body) {
  return await axios.post(CATEGORY_URL, body, {
    headers: { "Content-Type": "text/xml;charset=UTF-8" },
  });
}

async function parseXML(xml) {
  return await xml2js.parseStringPromise(xml, { explicitArray: false });
}

// Alt kategorileri recursive şekilde alıyoruz
async function getSubCategories(appKey, appSecret, categoryId, parentPath) {
  const xml = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
      xmlns:sch="http://www.n11.com/ws/schemas">
      <soapenv:Header/>
      <soapenv:Body>
        <sch:GetCategoryAttributesRequest>
          <auth>
            <appKey>${appKey}</appKey>
            <appSecret>${appSecret}</appSecret>
          </auth>
          <categoryId>${categoryId}</categoryId>
        </sch:GetCategoryAttributesRequest>
      </soapenv:Body>
    </soapenv:Envelope>
  `;

  try {
    const response = await soapRequest(xml);
    const parsed = await parseXML(response.data);

    const result =
      parsed["s:Envelope"]["s:Body"].GetCategoryAttributesResponse.category;

    const categoryName = result.name;
    const fullPath = parentPath ? `${parentPath} > ${categoryName}` : categoryName;

    await N11Category.updateOne(
      { id: Number(result.id) },
      {
        id: Number(result.id),
        name: result.name,
        parentId: Number(result.parentId || 0),
        fullPath,
        attributes: result.attributeList?.attribute || [],
      },
      { upsert: true }
    );

    if (result.subCategoryList?.subCategory) {
      const subcats = Array.isArray(result.subCategoryList.subCategory)
        ? result.subCategoryList.subCategory
        : [result.subCategoryList.subCategory];

      for (const sub of subcats) {
        await getSubCategories(appKey, appSecret, sub.id, fullPath);
      }
    }
  } catch (error) {
    console.error("Alt kategori çekme hatası:", error);
  }
}

export default async function handler(req, res) {
  await dbConnect();

  const APP_KEY = process.env.N11_APP_KEY;
  const APP_SECRET = process.env.N11_APP_SECRET;

  try {
    await N11Category.deleteMany({});

    // STEP 1 — TOP LEVEL KATEGORİLERİ ÇEK
    const xml = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
        xmlns:sch="http://www.n11.com/ws/schemas">
        <soapenv:Header/>
        <soapenv:Body>
          <sch:GetTopLevelCategoriesRequest>
            <auth>
              <appKey>${APP_KEY}</appKey>
              <appSecret>${APP_SECRET}</appSecret>
            </auth>
          </sch:GetTopLevelCategoriesRequest>
        </soapenv:Body>
      </soapenv:Envelope>
    `;

    const response = await soapRequest(xml);
    const parsed = await parseXML(response.data);

    const topCategories =
      parsed["s:Envelope"]["s:Body"].GetTopLevelCategoriesResponse.categoryList.category;

    for (const cat of topCategories) {
      await getSubCategories(APP_KEY, APP_SECRET, cat.id, "");
    }

    const count = await N11Category.countDocuments();

    res.json({
      success: true,
      message: "N11 TAM kategori ağacı başarıyla güncellendi!",
      count,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
}
