/**
 * GİB Mükellef Önbelleği – Taxten getPartialUserList ile senkronizasyon
 * E-Fatura, E-Arşiv, E-İrsaliye mükellef bilgisi Taxten (GİB entegratörü) üzerinden alınır.
 */
import { connectToDatabase } from "@/lib/mongodb";
import { getPartialUserList, getUBLList } from "@/lib/taxten/taxtenClient";

const COL = "gib_mukellef_cache";
const BATCH_SIZE = 1000;
const DEFAULT_DAYS_BACK = 90; // İlk sync için son 90 gün

function toYmd(d) {
  return d.toISOString().slice(0, 10);
}

/**
 * Tek bir DocumentType için liste çekip cache'e yazar
 * @param {{ db, company, isTest, docType, startDate, endDate }}
 */
async function syncDocumentType({ db, company, isTest, docType, startDate, endDate }) {
  const col = db.collection(COL);
  let page = 0;
  let totalUpserted = 0;

  while (true) {
    const regStart = startDate || toYmd(new Date(Date.now() - DEFAULT_DAYS_BACK * 24 * 60 * 60 * 1000));
    const regEnd = endDate || toYmd(new Date());

    let data;
    try {
      data = await getPartialUserList({
        company,
        isTest,
        Role: "PK",
        IncludeBinary: false,
        DocumentType: docType,
        RegisterTimeStart: regStart,
        RegisterTimeEnd: regEnd,
        Page: page,
        PageSize: BATCH_SIZE,
      });
    } catch (err) {
      const body = err.response?.data;
      const code401 = body?.returnMessages?.some((m) => m.code === 401) || err.response?.status === 401;
      console.error(`[mukellefSync] getPartialUserList ${docType} sayfa ${page} hata:`, body || err.message);
      if (code401) {
        throw new Error(
          "Mükellef listesi için Taxten yetkisi yok (401). Bu özellik Taxten hesabınızda aktif olmayabilir. " +
          "Taxten destek ile görüşüp getPartialUserList/GetUserList erişimini açtırmanız gerekebilir."
        );
      }
      throw err;
    }

    const users = data?.Users ?? data?.users ?? data?.Items ?? data?.items ?? [];
    if (!Array.isArray(users) || users.length === 0) break;

    const now = new Date();
    const bulkOps = users.map((u) => {
      const vkn = String(u.VKN_TCKN ?? u.VknTckn ?? u.vknTckn ?? u.TaxNumber ?? "").replace(/\D/g, "");
      if (!vkn || (vkn.length !== 10 && vkn.length !== 11)) return null;
      const unvan = u.Title ?? u.Unvan ?? u.title ?? u.unvan ?? "";
      const setFields = {
        updatedAt: now,
        ...(unvan && { unvan }),
        ...(docType === "Invoice" && { efatura: true }),
        ...(docType === "DespatchAdvice" && { eirsaliye: true }),
      };
      return {
        updateOne: {
          filter: { vkn },
          update: {
            $set: setFields,
            $setOnInsert: {
              vkn,
              createdAt: now,
              efatura: docType === "Invoice",
              earsiv: true,
              eirsaliye: docType === "DespatchAdvice",
            },
          },
          upsert: true,
        },
      };
    }).filter(Boolean);

    if (bulkOps.length > 0) {
      const result = await col.bulkWrite(bulkOps, { ordered: false });
      totalUpserted += (result.upsertedCount || 0) + (result.modifiedCount || 0);
    }

    const totalCount = data?.TotalCount ?? data?.totalCount ?? data?.TotalPages;
    const hasMore = users.length >= BATCH_SIZE && (totalCount == null || page * BATCH_SIZE + users.length < totalCount);
    if (!hasMore) break;
    page++;
  }

  return totalUpserted;
}

/**
 * Tüm mükellef önbelleğini senkronize et
 * @param {{ companyId?, userId?, daysBack?, startDate?, endDate? }} opts
 */
export async function syncMukellefCache(opts = {}) {
  const { db } = await connectToDatabase();
  const companyId = opts.companyId ? String(opts.companyId) : null;
  const userId = opts.userId ? String(opts.userId) : null;
  const companyQuery = companyId
    ? { $or: [{ companyId }, { userId }] }
    : userId
      ? { userId }
      : {};
  const company = await db.collection("company_settings").findOne(companyQuery);

  if (!company || (!company.efatura?.taxtenClientId && !company.taxtenUsername)) {
    throw new Error("Taxten API bilgisi eksik. Firma ayarlarında Taxten girişi yapılmalı.");
  }

  const isTest = company.taxtenTestMode !== false;

  // Taxten kimlik doğrulamasını test et
  try {
    await getUBLList({
      company,
      isTest,
      Version: "1",
      Identifier: "",
      VKN_TCKN: company.vergiNo || company.vkn || "",
      DocType: "INVOICE",
      Type: "OUTBOUND",
      Page: 0,
      PageSize: 1,
    });
  } catch (authErr) {
    const body = authErr.response?.data;
    if (authErr.response?.status === 401 || body?.returnMessages?.some((m) => m.code === 401)) {
      throw new Error(
        "Taxten kimlik doğrulaması başarısız. Firma Ayarları'nda Taxten kullanıcı adı/şifre veya Client ID/API Key bilgilerini kontrol edin."
      );
    }
  }

  const startDate = opts.startDate || toYmd(new Date(Date.now() - (opts.daysBack ?? DEFAULT_DAYS_BACK) * 24 * 60 * 60 * 1000));
  const endDate = opts.endDate || toYmd(new Date());

  let total = 0;
  total += await syncDocumentType({ db, company, isTest, docType: "Invoice", startDate, endDate });
  total += await syncDocumentType({ db, company, isTest, docType: "DespatchAdvice", startDate, endDate });

  return { total, startDate, endDate };
}

/**
 * Cache'ten mükellef bilgisi getir
 * @param {string} vknTckn
 * @returns {Promise<{ vkn?, tckn?, unvan?, efatura, earsiv, eirsaliye } | null>}
 */
export async function getMukellefFromCache(vknTckn) {
  const num = String(vknTckn || "").replace(/\D/g, "");
  if (num.length !== 10 && num.length !== 11) return null;

  const { db } = await connectToDatabase();
  const doc = await db.collection(COL).findOne({ vkn: num });

  if (!doc) return null;

  return {
    vkn: num.length === 10 ? num : undefined,
    tckn: num.length === 11 ? num : undefined,
    unvan: doc.unvan,
    adres: doc.adres,
    vergiDairesi: doc.vergiDairesi,
    efatura: !!doc.efatura,
    earsiv: doc.earsiv !== false,
    eirsaliye: !!doc.eirsaliye,
  };
}
