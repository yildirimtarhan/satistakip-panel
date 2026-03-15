# Taxten E-Arşiv REST API Referansı

Kaynak: **E-Arşiv REST API Kullanım Kılavuzu v1.0**

## Bağlantı

| Ortam | URL |
|-------|-----|
| Test | `https://devrest.taxten.com/api/v1` |
| Canlı | `https://rest.taxten.com/api/v1` |

---

## Proje Uyumluluğu

| Metod | Endpoint | Proje |
|-------|----------|-------|
| SendUbl | POST /EArchiveInvoice/SendUbl | ✅ send.js (invoiceType EARSIV) |
| GetInvoiceDocument | POST /EArchiveInvoice/GetInvoiceDocument | ✅ api/efatura/earsiv/invoice-document |
| GetSignedInvoice | POST /EArchiveInvoice/GetSignedInvoice | ✅ api/efatura/earsiv/signed-invoice |
| CancelInvoice | POST /EArchiveInvoice/CancelInvoice | ✅ api/efatura/earsiv/cancel |
| GetEnvelopeStatus | POST /EArchiveInvoice/GetEnvelopeStatus | ✅ api/efatura/earsiv/envelope-status |
| GetEArchiveView | POST /EArchiveInvoice/GetEArchiveView | ✅ api/efatura/earsiv/view |
| GetUbl | POST /EArchiveInvoice/GetUbl | taxtenClient.earsivGetUbl |
| GetStatus | POST /EArchiveInvoice/GetStatus | taxtenClient.earsivGetStatus |
| RetriggerOperation | POST /EArchiveInvoice/RetriggerOperation | taxtenClient.earsivRetriggerOperation |

---

## SendUbl Yanıt Alanları (E-Arşiv)

| Alan | Açıklama |
|------|----------|
| EnvelopeId | Zarf ETTN |
| DocumentId | Fatura ETTN |
| InvoiceUUID | Fatura ETTN |
| InvoiceNumber | Fatura numarası |
| Status | Fatura ID |

---

## Başarılı Yanıt Kodları

| Kod | Açıklama |
|-----|----------|
| 6 | Zip boyutu geçerlidir |
| 15 | Hash geçerlidir |
| 22 | Uyumlu çıktı (PDF) talebi |
| 26 | Şema kontrolü geçerlidir |
| 45 | Şematron kontrolü geçerlidir |
| 55 | Rapor veri alanları geçerlidir |
| 105 | Fatura XSLT'si kontrol edildi (PDF için min statü) |
| 130 | İmzalı (GetSignedInvoice için min statü) |
| 200 | OK |
