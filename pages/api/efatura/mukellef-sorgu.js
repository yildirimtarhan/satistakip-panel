// 📁 /pages/api/efatura/mukellef-sorgu.js – Mükellef sorgulama (Taxten/GİB gerçek veri)
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/mongodb";
import { getMukellefFromCache } from "@/lib/efatura/mukellefSync";
import { getPartialUserList } from "@/lib/taxten/taxtenClient";

function toYmd(d) {
  return d.toISOString().slice(0, 10);
}

/**
 * Taxten'den son kayıtları çekip belirtilen VKN'yi ara, bulunursa cache'e ekle ve döndür
 */
async function tryTaxtenOnDemandLookup(num, company, isTest) {
  const endDate = toYmd(new Date());
  const startDate = toYmd(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)); // son 60 gün
  let unvan = "";
  let efatura = false;
  let eirsaliye = false;

  for (const docType of ["Invoice", "DespatchAdvice"]) {
    try {
      const data = await getPartialUserList({
        company,
        isTest,
        Role: "PK",
        IncludeBinary: false,
        DocumentType: docType,
        RegisterTimeStart: startDate,
        RegisterTimeEnd: endDate,
        Page: 0,
        PageSize: 5000,
      });
      const users = data?.Users ?? data?.users ?? data?.Items ?? data?.items ?? [];
      const found = users.find((u) => {
        const v = String(u.VKN_TCKN ?? u.VknTckn ?? u.vknTckn ?? u.TaxNumber ?? "").replace(/\D/g, "");
        return v === num;
      });
      if (found) {
        unvan = found.Title ?? found.Unvan ?? found.title ?? found.unvan ?? "";
        if (docType === "Invoice") efatura = true;
        if (docType === "DespatchAdvice") eirsaliye = true;
      }
    } catch {
      // Devam et
    }
  }
  if (efatura || eirsaliye) {
    return { unvan: unvan || undefined, efatura, earsiv: true, eirsaliye };
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Sadece POST desteklenir" });
  }

  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Token gerekli" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { vknTckn } = req.body || {};
    const num = String(vknTckn || "").replace(/\D/g, "");
    if (num.length !== 10 && num.length !== 11) {
      return res.status(400).json({ message: "VKN 10 veya TCKN 11 haneli olmalıdır." });
    }

    // 1) Önce cache'ten kontrol et (Taxten/GİB sync verisi)
    let result = await getMukellefFromCache(num);
    if (result) {
      return res.status(200).json(result);
    }

    // 2) Cache'te yoksa Taxten'den on-demand sorgula (son 60 gün kayıtlar)
    const { db } = await connectToDatabase();
    const companyId = decoded?.companyId ? String(decoded.companyId) : null;
    const companyQuery = companyId
      ? { $or: [{ companyId }, { userId: String(decoded?.userId) }] }
      : { userId: String(decoded?.userId) };
    const company = await db.collection("company_settings").findOne(companyQuery);

    if (company && (company.efatura?.taxtenClientId || company.taxtenUsername)) {
      const isTest = company.taxtenTestMode !== false;
      const onDemand = await tryTaxtenOnDemandLookup(num, company, isTest);
      if (onDemand) {
        const col = db.collection("gib_mukellef_cache");
        const now = new Date();
        await col.updateOne(
          { vkn: num },
          {
            $set: {
              ...onDemand,
              updatedAt: now,
              unvan: onDemand.unvan,
            },
            $setOnInsert: {
              vkn: num,
              createdAt: now,
              efatura: onDemand.efatura ?? false,
              earsiv: onDemand.earsiv !== false,
              eirsaliye: onDemand.eirsaliye ?? false,
            },
          },
          { upsert: true }
        );
        return res.status(200).json({
          vkn: num.length === 10 ? num : undefined,
          tckn: num.length === 11 ? num : undefined,
          unvan: onDemand.unvan,
          efatura: onDemand.efatura ?? false,
          earsiv: onDemand.earsiv !== false,
          eirsaliye: onDemand.eirsaliye ?? false,
        });
      }
    }

    // 3) Bulunamadı
    return res.status(200).json({
      message: "Mükellef bulunamadı. Taxten/GİB önbelleğini güncellemek için Mükellef Listesi Senkronizasyonu yapın.",
      vkn: num.length === 10 ? num : undefined,
      tckn: num.length === 11 ? num : undefined,
      efatura: false,
      earsiv: false,
      eirsaliye: false,
    });
  } catch (err) {
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Geçersiz token" });
    }
    return res.status(500).json({ message: "Sunucu hatası" });
  }
}
