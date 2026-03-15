# Taxten E-Fatura REST API Referansı

Kaynak: **E-Fatura REST API Kullanım Kılavuzu v1.0**

> E-Arşiv API: Bkz. [TAXTEN-EARSIV-API-REFERANS.md](./TAXTEN-EARSIV-API-REFERANS.md)

## Bağlantı

| Ortam | URL |
|-------|-----|
| Test | `https://devrest.taxten.com/api/v1` |
| Canlı | `https://rest.taxten.com/api/v1` |

- **Auth:** HTTP Basic (username:password)
- **Zaman aşımı:** 5 dakika önerilir

---

## Proje Uyumluluğu

| Metod | Endpoint | Proje |
|-------|----------|-------|
| sendUBL | POST /Invoice/SendUbl | ✅ send.js |
| getUBLList | GET /Invoice/getUBLList | ✅ api/efatura/taxten/ubl-list |
| getUBL | POST /Invoice/getUBL | ✅ api/efatura/taxten/ubl |
| getInvoiceStatus | POST /Invoice/getInvoiceStatus | ✅ api/efatura/taxten/invoice-status |
| getInvoiceView | POST /Invoice/getInvoiceView | ✅ api/efatura/taxten/invoice-view |
| getRawUserList | POST /Invoice/getRawUserList | ⏳ |
| getPartialUserList | POST /Invoice/getPartialUserList | ⏳ |
| getInvResponses | POST /Invoice/getInvResponses | ✅ taxtenClient.getInvResponses |

---

## SendUbl Parametreleri

| Alan | Zorunlu | Açıklama |
|------|---------|----------|
| VKN_TCKN | Evet | Gönderici VKN/TCKN |
| SenderIdentifier | Zarfsızda evet | Gönderici etiketi (GB) |
| ReceiverIdentifier | Zarfsızda evet | Alıcı etiketi (PK) |
| DocType | Evet | ENVELOPE, INVOICE, APP_RESP |
| DocData | Evet | ZIP Base64 |
| Parameters | Hayır | IS_DRAFT, RESEND:{EnvUUID} |

**XSLT:** Tüm fatura gönderimlerinde UBL XML'e XSLT eklenmeli. `filename` = `FaturaID.xslt` formatında.

---

## Test Akışı (Doküman 6. Bölüm)

1. **Fatura Gönderim:** sendUBL ile fatura gönder → hata kontrolü
2. **getUBLList:** Gönderilen fatura UUID ile listele
3. **getInvoiceStatus:** Zarf durumu 1300 olana kadar sorgula
4. **Fatura Alım:** getUBLList (INBOUND) → getUBL → getInvoiceView
5. **Uygulama Yanıtı:** UY gönder → durum takibi → UY alım

---

## Hata Kodları

Bkz. `pages/api/efatura/send.js` içinde `TAXTEN_ERROR_CODES`.
