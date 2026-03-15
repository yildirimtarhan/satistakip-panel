/**
 * Taxten panelinden gelen/giden fatura ve irsaliye listesini ERP kullanıcı bilgisine göre senkronize eder.
 * getUBLList (E-Fatura) + despatchGetUblList (E-İrsaliye) → efatura_sent, efatura_incoming, efatura_irsaliye_sent, efatura_irsaliye_incoming
 */
import { getUBLList } from "@/lib/taxten/taxtenClient";
import { despatchGetUblList } from "@/lib/taxten/taxtenClient";

const DAYS_BACK = 30; // Son kaç gün çekilecek
const PAGE_SIZE = 100;

/** Taxten: tarih formatı 2018-01-01T00:00:00.00+03:00 (Türkiye) */
function toTaxtenDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}:${s}.00+03:00`;
}

function normalizeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  const list =
    data.List ??
    data.InvoiceList ??
    data.EnvelopeList ??
    data.Data ??
    data.Items ??
    [];
  if (Array.isArray(list)) return list;
  if (list && typeof list === "object") return list.Items ?? list.Data ?? list.List ?? [];
  return [];
}

/**
 * Tek günlük getUBLList çağrısı (Taxten max 1 gün)
 * @returns {{ list: any[], rawKeys?: string[], error?: string }}
 */
async function fetchInvoiceListForDay(company, isTest, type, startDate, endDate, page) {
  const identifier =
    company.senderIdentifier || `urn:mail:${company.taxtenUsername || company.vergiNo || ""}`;
  const vkn = company.vergiNo || company.vkn || "";
  const opts = {
    company,
    isTest,
    Identifier: identifier,
    VKN_TCKN: vkn,
    DocType: "INVOICE",
    Type: type,
    StartDate: toTaxtenDate(startDate),
    EndDate: toTaxtenDate(endDate),
    Page: page,
    PageSize: PAGE_SIZE,
  };
  try {
    const data = await getUBLList(opts);
    const list = normalizeList(data);
    const rawKeys = data && typeof data === "object" ? Object.keys(data) : [];
    return { list, rawKeys };
  } catch (err) {
    return { list: [], error: err.message || err.response?.data ? JSON.stringify(err.response.data) : String(err) };
  }
}

/**
 * Tarih aralığı için gün gün getUBLList (OUTBOUND veya INBOUND)
 * @returns {{ items: any[], lastRawKeys?: string[], errors: string[] }}
 */
async function fetchAllInvoiceList(company, isTest, type) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - DAYS_BACK);
  const all = [];
  const errors = [];
  let lastRawKeys;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayStart = new Date(d);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(d);
    dayEnd.setHours(23, 59, 59, 999);
    let page = 1;
    while (true) {
      const { list, rawKeys, error } = await fetchInvoiceListForDay(company, isTest, type, dayStart, dayEnd, page);
      if (rawKeys?.length) lastRawKeys = rawKeys;
      if (error) errors.push(`${type} ${dayStart.toISOString().slice(0, 10)}: ${error}`);
      if (!list.length) break;
      all.push(...list);
      if (list.length < PAGE_SIZE) break;
      page++;
    }
  }
  return { items: all, lastRawKeys, errors };
}

/**
 * E-İrsaliye listesi – Despatch API (FromDate/ToDate formatı API’ye göre ayarlanabilir)
 */
async function fetchDespatchListForRange(company, isTest, type, fromDate, toDate) {
  const identifier =
    company.senderIdentifier || `urn:mail:${company.taxtenUsername || company.vergiNo || ""}`;
  const opts = {
    company,
    isTest,
    Identifier: identifier,
    VKN_TCKN: company.vergiNo || company.vkn || "",
    DocType: "DESPATCH",
    Type: type,
    FromDate: fromDate ? toTaxtenDate(fromDate) : undefined,
    ToDate: toDate ? toTaxtenDate(toDate) : undefined,
  };
  try {
    const data = await despatchGetUblList(opts);
    return { list: normalizeList(data), error: null };
  } catch (err) {
    return { list: [], error: err.message || (err.response?.data ? JSON.stringify(err.response.data) : String(err)) };
  }
}

async function fetchAllDespatchList(company, isTest, type) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - DAYS_BACK);
  const all = [];
  const errors = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayStart = new Date(d);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(d);
    dayEnd.setHours(23, 59, 59, 999);
    const { list, error } = await fetchDespatchListForRange(company, isTest, type, dayStart, dayEnd);
    if (error) errors.push(`${type} despatch ${dayStart.toISOString().slice(0, 10)}: ${error}`);
    if (list.length) all.push(...list);
  }
  return { items: all, errors };
}

function mapToSentDoc(item, userId, companyId) {
  const uuid = item.UUID ?? item.uuid ?? item.Ettn ?? "";
  const id = item.ID ?? item.Id ?? item.InvoiceNumber ?? "";
  const insertDate = item.InsertDateTime ?? item.InsertDate ?? item.CreatedAt;
  return {
    uuid,
    envUuid: item.EnvUUID ?? item.envUuid ?? null,
    invoiceNumber: id,
    invoiceNo: id,
    faturaNo: id,
    custInvId: item.CustInvID ?? item.custInvId ?? null,
    sentAt: insertDate ? new Date(insertDate) : new Date(),
    status: "sent",
    isEarsiv: false,
    userId,
    companyId: companyId || null,
    source: "taxten_sync",
    taxtenSyncedAt: new Date(),
  };
}

function mapToIncomingDoc(item, userId, companyId) {
  const uuid = item.UUID ?? item.uuid ?? item.Ettn ?? "";
  const id = item.ID ?? item.Id ?? item.InvoiceNumber ?? "";
  const insertDate = item.InsertDateTime ?? item.InsertDate ?? item.CreatedAt;
  return {
    uuid,
    invoiceNo: id,
    faturaNo: id,
    senderTitle: item.SenderTitle ?? item.senderTitle ?? item.Identifier ?? "",
    receivedAt: insertDate ? new Date(insertDate) : new Date(),
    userId,
    companyId: companyId || null,
    source: "taxten_sync",
    taxtenSyncedAt: new Date(),
  };
}

function mapToIrsaliyeSentDoc(item, userId, companyId) {
  const uuid = item.UUID ?? item.uuid ?? item.Ettn ?? "";
  const id = item.ID ?? item.Id ?? item.IrsaliyeNo ?? "";
  const insertDate = item.InsertDateTime ?? item.InsertDate ?? item.CreatedAt;
  return {
    uuid,
    envUuid: item.EnvUUID ?? item.envUuid ?? null,
    irsaliyeNo: id,
    sentAt: insertDate ? new Date(insertDate) : new Date(),
    status: "sent",
    userId,
    companyId: companyId || null,
    source: "taxten_sync",
    taxtenSyncedAt: new Date(),
  };
}

function mapToIrsaliyeIncomingDoc(item, userId, companyId) {
  const uuid = item.UUID ?? item.uuid ?? item.Ettn ?? "";
  const id = item.ID ?? item.Id ?? item.IrsaliyeNo ?? "";
  const insertDate = item.InsertDateTime ?? item.InsertDate ?? item.CreatedAt;
  return {
    uuid,
    irsaliyeNo: id,
    receivedAt: insertDate ? new Date(insertDate) : new Date(),
    userId,
    companyId: companyId || null,
    source: "taxten_sync",
    taxtenSyncedAt: new Date(),
  };
}

/**
 * Taxten’den gelen/giden fatura ve irsaliyeyi çekip DB’ye yazar (tek firma/kullanıcı).
 * @param {{ db, company, userId, companyId }}
 * @returns {{ sent: number, incoming: number, irsaliyeSent: number, irsaliyeIncoming: number, errors: string[] }}
 */
export async function syncTaxtenBelgelerForUser({ db, company, userId, companyId }) {
  const isTest = company.taxtenTestMode !== false;
  const tenantFilter = companyId ? { companyId } : { userId };
  const errors = [];
  let sentUpserted = 0,
    incomingUpserted = 0,
    irsaliyeSentUpserted = 0,
    irsaliyeIncomingUpserted = 0;
  let debug = null;

  try {
    // 1) E-Fatura OUTBOUND → efatura_sent
    const outboundResult = await fetchAllInvoiceList(company, isTest, "OUTBOUND");
    const outboundList = outboundResult.items || [];
    if (outboundResult.errors?.length) errors.push(...outboundResult.errors);

    const sentCol = db.collection("efatura_sent");
    for (const item of outboundList) {
      const doc = mapToSentDoc(item, userId, companyId);
      if (!doc.uuid) continue;
      const result = await sentCol.updateOne(
        { uuid: doc.uuid, ...tenantFilter },
        {
          $set: {
            uuid: doc.uuid,
            envUuid: doc.envUuid,
            invoiceNumber: doc.invoiceNumber,
            invoiceNo: doc.invoiceNo,
            faturaNo: doc.faturaNo,
            sentAt: doc.sentAt,
            status: "sent",
            source: "taxten_sync",
            taxtenSyncedAt: doc.taxtenSyncedAt,
          },
          $setOnInsert: { userId: doc.userId, companyId: doc.companyId, isEarsiv: false },
        },
        { upsert: true }
      );
      if (result.upsertedCount || result.modifiedCount) sentUpserted++;
    }

    // 2) E-Fatura INBOUND → efatura_incoming (Identifier alıcı etiket; aynı identifier kullanılıyor olabilir)
    const inboundResult = await fetchAllInvoiceList(company, isTest, "INBOUND");
    const inboundList = inboundResult.items || [];
    if (inboundResult.errors?.length) errors.push(...inboundResult.errors);
    if (inboundResult.lastRawKeys) debug = { ...debug, invoiceInboundRawKeys: inboundResult.lastRawKeys };

    const incomingCol = db.collection("efatura_incoming");
    for (const item of inboundList) {
      const doc = mapToIncomingDoc(item, userId, companyId);
      if (!doc.uuid) continue;
      const result = await incomingCol.updateOne(
        { uuid: doc.uuid, ...tenantFilter },
        {
          $set: {
            uuid: doc.uuid,
            invoiceNo: doc.invoiceNo,
            faturaNo: doc.faturaNo,
            senderTitle: doc.senderTitle,
            receivedAt: doc.receivedAt,
            source: "taxten_sync",
            taxtenSyncedAt: doc.taxtenSyncedAt,
          },
          $setOnInsert: { userId: doc.userId, companyId: doc.companyId },
        },
        { upsert: true }
      );
      if (result.upsertedCount || result.modifiedCount) incomingUpserted++;
    }

    // 3) E-İrsaliye OUTBOUND → efatura_irsaliye_sent
    const despatchOutResult = await fetchAllDespatchList(company, isTest, "OUTBOUND");
    const despatchOut = despatchOutResult.items || [];
    if (despatchOutResult.errors?.length) errors.push(...despatchOutResult.errors);

    const irsaliyeSentCol = db.collection("efatura_irsaliye_sent");
    for (const item of despatchOut) {
      const doc = mapToIrsaliyeSentDoc(item, userId, companyId);
      if (!doc.uuid) continue;
      const result = await irsaliyeSentCol.updateOne(
        { uuid: doc.uuid, ...tenantFilter },
        {
          $set: {
            uuid: doc.uuid,
            envUuid: doc.envUuid,
            irsaliyeNo: doc.irsaliyeNo,
            sentAt: doc.sentAt,
            status: "sent",
            source: "taxten_sync",
            taxtenSyncedAt: doc.taxtenSyncedAt,
          },
          $setOnInsert: { userId: doc.userId, companyId: doc.companyId },
        },
        { upsert: true }
      );
      if (result.upsertedCount || result.modifiedCount) irsaliyeSentUpserted++;
    }

    // 4) E-İrsaliye INBOUND → efatura_irsaliye_incoming
    const despatchInResult = await fetchAllDespatchList(company, isTest, "INBOUND");
    const despatchIn = despatchInResult.items || [];
    if (despatchInResult.errors?.length) errors.push(...despatchInResult.errors);

    const irsaliyeIncomingCol = db.collection("efatura_irsaliye_incoming");
    for (const item of despatchIn) {
      const doc = mapToIrsaliyeIncomingDoc(item, userId, companyId);
      if (!doc.uuid) continue;
      const result = await irsaliyeIncomingCol.updateOne(
        { uuid: doc.uuid, ...tenantFilter },
        {
          $set: {
            uuid: doc.uuid,
            irsaliyeNo: doc.irsaliyeNo,
            receivedAt: doc.receivedAt,
            source: "taxten_sync",
            taxtenSyncedAt: doc.taxtenSyncedAt,
          },
          $setOnInsert: { userId: doc.userId, companyId: doc.companyId },
        },
        { upsert: true }
      );
      if (result.upsertedCount || result.modifiedCount) irsaliyeIncomingUpserted++;
    }
    // Veri gelmediyse debug bilgisi ekle (Taxten yanıt yapısını görmek için)
    const total = sentUpserted + incomingUpserted + irsaliyeSentUpserted + irsaliyeIncomingUpserted;
    if (total === 0) {
      debug = {
        identifier: company.senderIdentifier || `urn:mail:${company.taxtenUsername || company.vergiNo || ""}`,
        vkn: company.vergiNo || company.vkn || "",
        isTest,
        invoiceOutboundRawKeys: outboundResult?.lastRawKeys,
        invoiceInboundRawKeys: inboundResult?.lastRawKeys,
      };
    }
  } catch (err) {
    errors.push(err.message || String(err));
  }

  return {
    sent: sentUpserted,
    incoming: incomingUpserted,
    irsaliyeSent: irsaliyeSentUpserted,
    irsaliyeIncoming: irsaliyeIncomingUpserted,
    errors,
    debug: debug || undefined,
  };
}
