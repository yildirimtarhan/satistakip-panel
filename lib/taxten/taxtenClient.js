/**
 * Taxten E-Fatura & E-Arşiv REST API Client
 * Doküman: E-Fatura REST API Kullanım Kılavuzu v1.0, E-Arşiv REST API Kullanım Kılavuzu v1.0
 * Base: devrest.taxten.com (test) / rest.taxten.com (canlı)
 */
import axios from "axios";

const TAXTEN_TEST = "https://devrest.taxten.com/api/v1";
const TAXTEN_LIVE = "https://rest.taxten.com/api/v1";

function getBaseUrl(isTest = true) {
  return isTest ? TAXTEN_TEST : TAXTEN_LIVE;
}

function buildHeaders(company) {
  const clientId = company?.efatura?.taxtenClientId || company?.taxtenClientId;
  const apiKey = company?.efatura?.taxtenApiKey || company?.taxtenApiKey;
  const useClientId = clientId && apiKey;
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  if (useClientId) {
    headers["x-client-id"] = clientId;
    headers["x-api-key"] = apiKey;
  } else if (company?.taxtenUsername && company?.taxtenPassword) {
    headers.Authorization = `Basic ${Buffer.from(`${company.taxtenUsername}:${company.taxtenPassword}`).toString("base64")}`;
  }
  return headers;
}

/**
 * Gelen/Gönderilen UBL belge listesi
 * GET /Invoice/getUBLList
 * @param {{ company, isTest, Version?, Identifier, VKN_TCKN, UUID?, DocType, Type, StartDate?, EndDate?, Page?, PageSize? }}
 */
export async function getUBLList(opts) {
  const baseUrl = getBaseUrl(opts.isTest !== false);
  const headers = buildHeaders(opts.company);
  const params = new URLSearchParams();
  params.set("Version", opts.Version ?? "1");
  params.set("Identifier", opts.Identifier ?? "");
  params.set("VKN_TCKN", opts.VKN_TCKN ?? opts.company?.vergiNo ?? "");
  params.set("DocType", opts.DocType ?? "INVOICE");
  params.set("Type", opts.Type ?? "OUTBOUND"); // OUTBOUND | INBOUND
  if (opts.Page != null) params.set("Page", String(opts.Page));
  if (opts.PageSize != null) params.set("PageSize", String(opts.PageSize));
  if (opts.StartDate) params.set("StartDate", opts.StartDate);
  if (opts.EndDate) params.set("EndDate", opts.EndDate);
  if (opts.UUID && Array.isArray(opts.UUID)) {
    opts.UUID.forEach((u) => params.append("UUID", u));
  } else if (opts.UUID) {
    params.append("UUID", opts.UUID);
  }

  const res = await axios.get(`${baseUrl}/Invoice/getUBLList?${params}`, {
    headers,
    timeout: 120000,
  });
  return res.data;
}

/**
 * Belge indirme
 * POST /Invoice/getUBL
 * @param {{ company, isTest, Identifier, VKN_TCKN, UUID, DocType, Type, IsZip? }}
 */
export async function getUBL(opts) {
  const baseUrl = getBaseUrl(opts.isTest !== false);
  const headers = buildHeaders(opts.company);
  const body = {
    Identifier: opts.Identifier ?? "",
    VKN_TCKN: opts.VKN_TCKN ?? opts.company?.vergiNo ?? "",
    UUID: Array.isArray(opts.UUID) ? opts.UUID : [opts.UUID],
    DocType: opts.DocType ?? "INVOICE",
    Type: opts.Type ?? "OUTBOUND",
    IsZip: opts.IsZip !== false,
  };

  const res = await axios.post(`${baseUrl}/Invoice/getUBL`, body, {
    headers,
    timeout: 120000,
  });
  return res.data;
}

/**
 * Zarf durum sorgulama (getInvoiceStatus)
 * POST /Invoice/getInvoiceStatus
 * @param {{ company, isTest, Identifier, VKN_TCKN, UUID, Parameters? }}
 */
export async function getInvoiceStatus(opts) {
  const baseUrl = getBaseUrl(opts.isTest !== false);
  const headers = buildHeaders(opts.company);
  const body = {
    Identifier: opts.Identifier ?? opts.company?.senderIdentifier ?? `urn:mail:${opts.company?.taxtenUsername ?? opts.company?.vergiNo}`,
    VKN_TCKN: opts.VKN_TCKN ?? opts.company?.vergiNo ?? "",
    UUID: Array.isArray(opts.UUID) ? opts.UUID : [opts.UUID],
  };
  if (opts.Parameters) body.Parameters = opts.Parameters;

  const res = await axios.post(`${baseUrl}/Invoice/getInvoiceStatus`, body, {
    headers,
    timeout: 60000,
  });
  return res.data;
}

/**
 * Fatura görüntüsü alma
 * POST /Invoice/getInvoiceView
 * @param {{ company, isTest, UUID, CustInvID?, Identifier, VKN_TCKN, Type, DocType? }}
 */
export async function getInvoiceView(opts) {
  const baseUrl = getBaseUrl(opts.isTest !== false);
  const headers = buildHeaders(opts.company);
  const body = {
    UUID: opts.UUID,
    Identifier: opts.Identifier ?? opts.company?.senderIdentifier ?? `urn:mail:${opts.company?.taxtenUsername ?? opts.company?.vergiNo}`,
    VKN_TCKN: opts.VKN_TCKN ?? opts.company?.vergiNo ?? "",
    Type: opts.Type ?? "OUTBOUND",
    DocType: opts.DocType ?? "HTML", // HTML, PDF, XSLT, HTML_DEFAULT, PDF_DEFAULT
  };
  if (opts.CustInvID) body.CustInvID = opts.CustInvID;

  const res = await axios.post(`${baseUrl}/Invoice/getInvoiceView`, body, {
    headers,
    responseType: "json",
    timeout: 60000,
  });
  return res.data;
}

/**
 * Uygulama yanıtı sorgulama
 * POST /Invoice/getInvResponses
 */
export async function getInvResponses(opts) {
  const baseUrl = getBaseUrl(opts.isTest !== false);
  const headers = buildHeaders(opts.company);
  const body = {
    Identifier: opts.Identifier ?? opts.company?.senderIdentifier ?? "",
    VKN_TCKN: opts.VKN_TCKN ?? opts.company?.vergiNo ?? "",
    UUID: Array.isArray(opts.UUID) ? opts.UUID : [opts.UUID],
    TYPE: opts.TYPE ?? "OUTBOUND",
  };
  if (opts.Parameters) body.Parameters = opts.Parameters;

  const res = await axios.post(`${baseUrl}/Invoice/getInvResponses`, body, {
    headers,
    timeout: 60000,
  });
  return res.data;
}

// ============ E-ARŞİV API (EArchiveInvoice) ============

/**
 * e-Arşiv fatura görüntüsü (PDF)
 * POST /EArchiveInvoice/GetInvoiceDocument
 */
export async function earsivGetInvoiceDocument(opts) {
  const baseUrl = getBaseUrl(opts.isTest !== false);
  const headers = buildHeaders(opts.company);
  const body = { VKN_TCKN: opts.VKN_TCKN ?? opts.company?.vergiNo ?? "" };
  if (opts.UUID) body.UUID = opts.UUID;
  if (opts.InvoiceNumber) body.InvoiceNumber = opts.InvoiceNumber;
  if (opts.CustInvID) body.CustInvID = opts.CustInvID;

  const res = await axios.post(`${baseUrl}/EArchiveInvoice/GetInvoiceDocument`, body, {
    headers,
    timeout: 60000,
  });
  return res.data;
}

/**
 * İmzalı e-Arşiv fatura XML
 * POST /EArchiveInvoice/GetSignedInvoice
 */
export async function earsivGetSignedInvoice(opts) {
  const baseUrl = getBaseUrl(opts.isTest !== false);
  const headers = buildHeaders(opts.company);
  const body = { VKN_TCKN: opts.VKN_TCKN ?? opts.company?.vergiNo ?? "" };
  if (opts.UUID) body.UUID = opts.UUID;
  if (opts.InvoiceNumber) body.InvoiceNumber = opts.InvoiceNumber;
  if (opts.CustInvId) body.CustInvId = opts.CustInvId;

  const res = await axios.post(`${baseUrl}/EArchiveInvoice/GetSignedInvoice`, body, {
    headers,
    timeout: 60000,
  });
  return res.data;
}

/**
 * e-Arşiv fatura iptali
 * POST /EArchiveInvoice/CancelInvoice
 */
export async function earsivCancelInvoice(opts) {
  const baseUrl = getBaseUrl(opts.isTest !== false);
  const headers = buildHeaders(opts.company);
  const body = {
    VKN_TCKN: opts.VKN_TCKN ?? opts.company?.vergiNo ?? "",
    Branch: opts.Branch ?? opts.company?.taxtenBranch ?? "default",
    TotalAmount: opts.TotalAmount,
    CancelDate: opts.CancelDate,
  };
  if (opts.InvoiceId) body.InvoiceId = opts.InvoiceId;
  if (opts.CustInvId) body.CustInvId = opts.CustInvId;

  const res = await axios.post(`${baseUrl}/EArchiveInvoice/CancelInvoice`, body, {
    headers,
    timeout: 60000,
  });
  return res.data;
}

/**
 * Zarf durum sorgulama (e-Arşiv)
 * POST /EArchiveInvoice/GetEnvelopeStatus
 */
export async function earsivGetEnvelopeStatus(opts) {
  const baseUrl = getBaseUrl(opts.isTest !== false);
  const headers = buildHeaders(opts.company);
  const body = {
    VKN_TCKN: opts.VKN_TCKN ?? opts.company?.vergiNo ?? "",
    UUID: Array.isArray(opts.UUID) ? opts.UUID : [opts.UUID],
  };

  const res = await axios.post(`${baseUrl}/EArchiveInvoice/GetEnvelopeStatus`, body, {
    headers,
    timeout: 60000,
  });
  return res.data;
}

/**
 * e-Arşiv fatura görünümü
 * POST /EArchiveInvoice/GetEArchiveView
 */
export async function earsivGetEArchiveView(opts) {
  const baseUrl = getBaseUrl(opts.isTest !== false);
  const headers = buildHeaders(opts.company);
  let details = opts.Details;
  if (!details?.length) {
    const d = {};
    if (opts.UUID) d.UUID = opts.UUID;
    if (opts.InvoiceNumber) d.InvoiceNumber = opts.InvoiceNumber;
    if (opts.CustInvId) d.CustInvId = opts.CustInvId;
    details = Object.keys(d).length ? [d] : [];
  }
  const body = {
    VKN_TCKN: opts.VKN_TCKN ?? opts.company?.vergiNo ?? "",
    Details: details,
  };

  const res = await axios.post(`${baseUrl}/EArchiveInvoice/GetEArchiveView`, body, {
    headers,
    timeout: 60000,
  });
  return res.data;
}

/**
 * e-Arşiv UBL belgesi
 * POST /EArchiveInvoice/GetUbl
 */
export async function earsivGetUbl(opts) {
  const baseUrl = getBaseUrl(opts.isTest !== false);
  const headers = buildHeaders(opts.company);
  const body = {
    VKN_TCKN: opts.VKN_TCKN ?? opts.company?.vergiNo ?? "",
    UUID: Array.isArray(opts.UUID) ? opts.UUID : [opts.UUID],
    DocType: opts.DocType ?? "INVOICE",
    Type: opts.Type ?? "OUTBOUND",
    IsZip: opts.IsZip !== false,
  };
  if (opts.Identifier) body.Identifier = opts.Identifier;

  const res = await axios.post(`${baseUrl}/EArchiveInvoice/GetUbl`, body, {
    headers,
    timeout: 60000,
  });
  return res.data;
}

/**
 * e-Arşiv rapor durumu
 * POST /EArchiveInvoice/GetStatus
 */
export async function earsivGetStatus(opts) {
  const baseUrl = getBaseUrl(opts.isTest !== false);
  const headers = buildHeaders(opts.company);
  const body = {
    VKN_TCKN: opts.VKN_TCKN ?? opts.company?.vergiNo ?? "",
    BatchId: opts.BatchId,
  };

  const res = await axios.post(`${baseUrl}/EArchiveInvoice/GetStatus`, body, {
    headers,
    timeout: 60000,
  });
  return res.data;
}

/**
 * Yeniden süreç tetikleme (e-Arşiv)
 * POST /EArchiveInvoice/RetriggerOperation
 */
export async function earsivRetriggerOperation(opts) {
  const baseUrl = getBaseUrl(opts.isTest !== false);
  const headers = buildHeaders(opts.company);
  const body = {
    VKN_TCKN: opts.VKN_TCKN ?? opts.company?.vergiNo ?? "",
    Branch: opts.Branch ?? opts.company?.taxtenBranch,
    ParameterName: opts.ParameterName,
    ParameterValue: opts.ParameterValue,
  };
  if (opts.InvoiceId) body.InvoiceId = opts.InvoiceId;
  if (opts.InvoiceUuid) body.InvoiceUuid = opts.InvoiceUuid;

  const res = await axios.post(`${baseUrl}/EArchiveInvoice/RetriggerOperation`, body, {
    headers,
    timeout: 60000,
  });
  return res.data;
}

// ============ E-İRSALİYE API (Despatch) ============
// Doküman: E-İrsaliye REST API Kullanım Kılavuzu v1.0

/**
 * E-İrsaliye / İrsaliye Yanıtı gönderme
 * POST /Despatch/SendUbl
 * @param {{ company, isTest, VKN_TCKN, SenderIdentifier?, ReceiverIdentifier?, DocType, DocData, Parameters? }}
 * DocType: ENVELOPE | DESPATCH | RECEIPT
 */
export async function despatchSendUbl(opts) {
  const baseUrl = getBaseUrl(opts.isTest !== false);
  const headers = buildHeaders(opts.company);
  const body = {
    VKN_TCKN: opts.VKN_TCKN ?? opts.company?.vergiNo ?? "",
    DocType: opts.DocType,
    DocData: opts.DocData,
  };
  if (opts.SenderIdentifier) body.SenderIdentifier = opts.SenderIdentifier;
  if (opts.ReceiverIdentifier) body.ReceiverIdentifier = opts.ReceiverIdentifier;
  if (opts.Parameters?.length) body.Parameters = opts.Parameters;

  const res = await axios.post(`${baseUrl}/Despatch/SendUbl`, body, {
    headers,
    timeout: 300000,
    maxBodyLength: 10 * 1024 * 1024,
    maxContentLength: 10 * 1024 * 1024,
  });
  return res.data;
}

/**
 * Gelen/Gönderilen E-İrsaliye UBL belge listesi
 * POST /Despatch/GetUblList
 * @param {{ company, isTest, Identifier, VKN_TCKN, UUID?, DocType, Type, FromDate?, ToDate? }}
 * DocType: ENVELOPE | DESPATCH | RECEIPT | SYS_RESP
 * Type: OUTBOUND | INBOUND
 */
export async function despatchGetUblList(opts) {
  const baseUrl = getBaseUrl(opts.isTest !== false);
  const headers = buildHeaders(opts.company);
  const body = {
    Identifier: opts.Identifier ?? opts.company?.senderIdentifier ?? `urn:mail:${opts.company?.taxtenUsername ?? opts.company?.vergiNo}`,
    VKN_TCKN: opts.VKN_TCKN ?? opts.company?.vergiNo ?? "",
    DocType: opts.DocType ?? "DESPATCH",
    Type: opts.Type ?? "OUTBOUND",
  };
  if (opts.UUID?.length) body.UUID = Array.isArray(opts.UUID) ? opts.UUID : [opts.UUID];
  if (opts.FromDate) body.FromDate = opts.FromDate;
  if (opts.ToDate) body.ToDate = opts.ToDate;

  const res = await axios.post(`${baseUrl}/Despatch/GetUblList`, body, {
    headers,
    timeout: 120000,
  });
  return res.data;
}

/**
 * E-İrsaliye belge indirme
 * POST /Despatch/GetUbl
 * @param {{ company, isTest, Identifier, VKN_TCKN, UUID, DocType, Type, Parameters? }}
 */
export async function despatchGetUbl(opts) {
  const baseUrl = getBaseUrl(opts.isTest !== false);
  const headers = buildHeaders(opts.company);
  const body = {
    Identifier: opts.Identifier ?? opts.company?.senderIdentifier ?? `urn:mail:${opts.company?.taxtenUsername ?? opts.company?.vergiNo}`,
    VKN_TCKN: opts.VKN_TCKN ?? opts.company?.vergiNo ?? "",
    UUID: Array.isArray(opts.UUID) ? opts.UUID : [opts.UUID],
    DocType: opts.DocType ?? "DESPATCH",
    Type: opts.Type ?? "OUTBOUND",
  };
  if (opts.Parameters?.length) body.Parameters = opts.Parameters;

  const res = await axios.post(`${baseUrl}/Despatch/GetUbl`, body, {
    headers,
    timeout: 120000,
  });
  return res.data;
}

/**
 * E-İrsaliye zarf durum sorgulama
 * POST /Despatch/GetDespatchStatus
 * @param {{ company, isTest, Identifier, VKN_TCKN, UUID, Parameters? }}
 */
export async function despatchGetStatus(opts) {
  const baseUrl = getBaseUrl(opts.isTest !== false);
  const headers = buildHeaders(opts.company);
  const body = {
    Identifier: opts.Identifier ?? opts.company?.senderIdentifier ?? `urn:mail:${opts.company?.taxtenUsername ?? opts.company?.vergiNo}`,
    VKN_TCKN: opts.VKN_TCKN ?? opts.company?.vergiNo ?? "",
    UUID: Array.isArray(opts.UUID) ? opts.UUID : [opts.UUID],
  };
  if (opts.Parameters?.length) body.Parameters = opts.Parameters;

  const res = await axios.post(`${baseUrl}/Despatch/GetDespatchStatus`, body, {
    headers,
    timeout: 60000,
  });
  return res.data;
}

/**
 * E-İrsaliye belge görüntüsü (HTML/PDF)
 * POST /Despatch/GetDesView
 * @param {{ company, isTest, Identifier, VKN_TCKN, Type, BelgeDetaylari }}
 * BelgeDetaylari: [{ UUID?, ID?, CustDesID?, VKN_TCKN, Type, DocType, ViewType }]
 * DocType: DESPATCH | RECEIPT, ViewType: HTML | PDF | XSLT | HTML_DEFAULT | PDF_DEFAULT
 */
export async function despatchGetView(opts) {
  const baseUrl = getBaseUrl(opts.isTest !== false);
  const headers = buildHeaders(opts.company);
  const body = {
    Identifier: opts.Identifier ?? opts.company?.senderIdentifier ?? `urn:mail:${opts.company?.taxtenUsername ?? opts.company?.vergiNo}`,
    VKN_TCKN: opts.VKN_TCKN ?? opts.company?.vergiNo ?? "",
    Type: opts.Type ?? "OUTBOUND",
    BelgeDetaylari: opts.BelgeDetaylari ?? [{
      VKN_TCKN: opts.company?.vergiNo ?? "",
      Type: opts.Type ?? "OUTBOUND",
      DocType: opts.DocType ?? "DESPATCH",
      ViewType: opts.ViewType ?? "PDF",
      ...(opts.UUID && { UUID: opts.UUID }),
      ...(opts.ID && { ID: opts.ID }),
      ...(opts.CustDesID && { CustDesID: opts.CustDesID }),
    }],
  };

  const res = await axios.post(`${baseUrl}/Despatch/GetDesView`, body, {
    headers,
    timeout: 60000,
  });
  return res.data;
}

/**
 * İrsaliye yanıtı sorgulama
 * POST /Despatch/GetDesReceipts
 * @param {{ company, isTest, Identifier, VKN_TCKN, UUID, TYPE }}
 */
export async function despatchGetReceipts(opts) {
  const baseUrl = getBaseUrl(opts.isTest !== false);
  const headers = buildHeaders(opts.company);
  const body = {
    Identifier: opts.Identifier ?? opts.company?.senderIdentifier ?? `urn:mail:${opts.company?.taxtenUsername ?? opts.company?.vergiNo}`,
    VKN_TCKN: opts.VKN_TCKN ?? opts.company?.vergiNo ?? "",
    UUID: Array.isArray(opts.UUID) ? opts.UUID : [opts.UUID],
    TYPE: opts.TYPE ?? "OUTBOUND",
  };

  const res = await axios.post(`${baseUrl}/Despatch/GetDesReceipts`, body, {
    headers,
    timeout: 60000,
  });
  return res.data;
}

/**
 * GİB mükellef listesi (parçalı) – E-Fatura / E-İrsaliye kayıtlı kullanıcılar
 * POST /Invoice/getPartialUserList
 * GİB'den Taxten üzerinden alınan kullanıcı listesi (E-Fatura, E-İrsaliye mükellefleri)
 * @param {{ company, isTest, Role?, IncludeBinary?, RegisterTimeStart?, RegisterTimeEnd?, DocumentType?, Page?, PageSize? }}
 * Role: "PK" (posta kutusu) | "GB" (gönderici birim)
 * DocumentType: "Invoice" (e-fatura) | "DespatchAdvice" (e-irsaliye)
 * @returns {Promise<{ Users?: Array<{ VKN_TCKN?: string, Title?: string, Type?: string }>, TotalCount?: number, Page?: number }>}
 */
export async function getPartialUserList(opts) {
  const baseUrl = getBaseUrl(opts?.isTest !== false);
  const headers = buildHeaders(opts?.company);
  const body = {
    Identifier: opts?.Identifier ?? opts?.company?.senderIdentifier ?? `urn:mail:${opts?.company?.taxtenUsername ?? opts?.company?.vergiNo}`,
    VKN_TCKN: opts?.VKN_TCKN ?? opts?.company?.vergiNo ?? "",
    Role: opts?.Role ?? "PK",
    IncludeBinary: opts?.IncludeBinary === true,
  };
  if (opts?.RegisterTimeStart) body.RegisterTimeStart = opts.RegisterTimeStart;
  if (opts?.RegisterTimeEnd) body.RegisterTimeEnd = opts.RegisterTimeEnd;
  if (opts?.DocumentType) body.DocumentType = opts.DocumentType; // Invoice | DespatchAdvice
  if (opts?.Page != null) body.Page = opts.Page;
  if (opts?.PageSize != null) body.PageSize = opts.PageSize ?? 1000;

  const res = await axios.post(`${baseUrl}/Invoice/getPartialUserList`, body, {
    headers,
    timeout: 180000,
  });
  return res?.data ?? res;
}

/**
 * GİB mükellef listesi (ham) – getRawUserList
 * POST /Invoice/getRawUserList
 * @param {{ company, isTest, Role?, RegisterTimeStart?, RegisterTimeEnd?, DocumentType? }}
 */
export async function getRawUserList(opts) {
  const baseUrl = getBaseUrl(opts?.isTest !== false);
  const headers = buildHeaders(opts?.company);
  const body = {
    Identifier: opts?.Identifier ?? opts?.company?.senderIdentifier ?? `urn:mail:${opts?.company?.taxtenUsername ?? opts?.company?.vergiNo}`,
    VKN_TCKN: opts?.VKN_TCKN ?? opts?.company?.vergiNo ?? "",
    Role: opts?.Role ?? "PK",
  };
  if (opts?.RegisterTimeStart) body.RegisterTimeStart = opts.RegisterTimeStart;
  if (opts?.RegisterTimeEnd) body.RegisterTimeEnd = opts.RegisterTimeEnd;
  if (opts?.DocumentType) body.DocumentType = opts.DocumentType;

  const res = await axios.post(`${baseUrl}/Invoice/getRawUserList`, body, {
    headers,
    timeout: 300000,
  });
  return res?.data ?? res;
}

/**
 * Kontör / Kredi bakiyesi sorgulama (Taxten panel verisi)
 * Taxten REST API'de kontör endpoint'i varsa kullanılır.
 * Doküman: Taxten ile iletişime geçilerek endpoint doğrulanmalıdır.
 * @param {{ company, isTest }} opts
 * @returns {Promise<{ remaining?: number, total?: number, loaded?: number, purchases?: [], usage?: number } | null>}
 */
export async function getCreditBalance(opts) {
  const baseUrl = getBaseUrl(opts?.isTest !== false);
  const headers = buildHeaders(opts?.company);
  const body = {
    VKN_TCKN: opts?.company?.vergiNo ?? opts?.company?.vkn ?? "",
    Identifier: opts?.company?.senderIdentifier ?? `urn:mail:${opts?.company?.taxtenUsername ?? opts?.company?.vergiNo}`,
  };

  const endpoints = [
    { method: "POST", url: `${baseUrl}/Account/GetCredit`, body },
    { method: "POST", url: `${baseUrl}/Credit/GetBalance`, body },
    { method: "POST", url: `${baseUrl}/Account/GetCreditBalance`, body },
    { method: "GET", url: `${baseUrl}/Credit/GetBalance?VKN_TCKN=${encodeURIComponent(body.VKN_TCKN)}&Identifier=${encodeURIComponent(body.Identifier)}` },
  ];

  for (const ep of endpoints) {
    try {
      const res = ep.method === "GET"
        ? await axios.get(ep.url, { headers, timeout: 15000 })
        : await axios.post(ep.url, body, { headers, timeout: 15000 });
      const data = res?.data;
      if (data && (data.Remaining != null || data.remaining != null || data.Balance != null || data.balance != null || data.TotalCredit != null)) {
        return {
          remaining: data.Remaining ?? data.remaining ?? data.Balance ?? data.balance ?? null,
          total: data.Total ?? data.total ?? data.TotalCredit ?? data.Loaded ?? data.loaded ?? null,
          loaded: data.Loaded ?? data.loaded ?? data.TotalCredit ?? null,
          purchases: data.Purchases ?? data.purchases ?? [],
          usage: data.Used ?? data.used ?? data.Usage ?? null,
        };
      }
    } catch {
      continue;
    }
  }
  return null;
}

export { TAXTEN_TEST, TAXTEN_LIVE };
