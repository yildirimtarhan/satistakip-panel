# GİB ve Taxten Uyumluluk Kontrol Listesi

**Güncelleme:** Taxten E-Fatura REST API Kullanım Kılavuzu v1.0 ile karşılaştırıldı.

---

## Dosya Referansları

| Dosya | Açıklama |
|-------|----------|
| `lib/efatura/createUbl.js` | UBL-TR 2.1 fatura XML üretimi |
| `lib/efatura/createUblZip.js` | ZIP paketleme (UUID.xml, BOM) |
| `lib/efatura/gibXslt.js` | GİB standart XSLT şablonu |
| `pages/api/efatura/send.js` | Taxten API çağrısı (E-Fatura, E-Arşiv) |
| `lib/taxten/fetchDrafts.js` | Taxten taslak senkronizasyonu |

---

## GİB Uyumluluk

### UBL-TR 2.1

- [ ] Invoice (TEMELFATURA, EARSIVFATURA)
- [ ] CreditNote (IADE)
- [ ] Zorunlu namespace ve prefix’ler
- [ ] cbc:, cac: eleman sırası

### XSLT

- [ ] AdditionalDocumentReference ile XSLT eklenmesi
- [ ] DocumentTypeCode: XSLT
- [ ] EmbeddedDocumentBinaryObject Base64

### Diğer

- [ ] IssueDate formatı YYYY-MM-DD
- [ ] Currency TRY
- [ ] UnitCode (C62 = adet)

---

## Taxten API (Kılavuz v1.0 ile Doğrulandı)

### E-Fatura

- [x] `POST /Invoice/SendUbl` path
- [x] VKN_TCKN, SenderIdentifier, ReceiverIdentifier
- [x] DocType: INVOICE
- [x] DocData: ZIP Base64
- [x] Parameters: IS_DRAFT, RESEND:{EnvUUID}

### Ek Metodlar

- [x] `GET /Invoice/getUBLList` – belge listesi
- [x] `POST /Invoice/getUBL` – belge indirme
- [x] `POST /Invoice/getInvoiceStatus` – zarf durum sorgusu
- [x] `POST /Invoice/getInvoiceView` – fatura görüntüsü

### E-Arşiv

- [x] `POST /EArchiveInvoice/SendUbl` path
- [x] Branch, OutputType alanları
- [x] GetInvoiceDocument, GetSignedInvoice, CancelInvoice
- [x] GetEnvelopeStatus, GetEArchiveView, GetUbl

### E-İrsaliye

- [ ] `POST /Despatch/SendUbl` path (e-Arşiv/e-İrsaliye dokümanı bekleniyor)
- [ ] DocType: DESPATCH / RECEIPT

### Kimlik Doğrulama

- [x] Basic Auth (username:password)
- [x] x-client-id + x-api-key (alternatif)

---

## Kontrol Edilecek Alanlar (Doküman Geldiğinde)

1. **Request body** alan adları (camelCase, PascalCase?)
2. **Response** yapısı
3. **Hata kodları** ve mesajları
4. **Zaman aşımı** önerisi
5. **Rate limit** kuralları

---

## Ek Referans

- **TAXTEN-EFATURA-API-REFERANS.md** – API metod özeti ve proje eşlemesi
