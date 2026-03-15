# E-Fatura / E-Arşiv / E-İrsaliye Test Planı

Bu dokümanda **test ortamında** doğrulanacak adımlar ve **canlıya geçiş öncesi** kontrol listesi bulunur.  
Taxten API dokümanları ile kod karşılaştırması yapıldıktan sonra güncellenir.

---

## Mevcut Durum Özeti

| Modül | Durum | Endpoint | Notlar |
|-------|-------|----------|--------|
| **E-Fatura** | ✅ Test için hazır | `POST /Invoice/SendUbl` | UBL-TR 2.1, XSLT eklendi |
| **E-Arşiv** | ✅ Test için hazır | `POST /EArchiveInvoice/SendUbl` | Branch, OutputType destekli |
| **E-İrsaliye** | ⏳ Yapılacak | `POST /Despatch/SendUbl` | Taxten dokümanına göre eklenecek |

---

## 1. Ön Koşullar (Test Ortamı)

- [ ] MongoDB çalışıyor
- [ ] `.env` içinde `JWT_SECRET` tanımlı
- [ ] Firma ayarlarında VKN, Vergi Dairesi, Adres, Telefon, E-posta dolu
- [ ] Taxten test hesabı: `taxtenUsername` + `taxtenPassword` veya `taxtenClientId` + `taxtenApiKey`
- [ ] Taxten test modu açık (`taxtenTestMode: true`) → `devrest.taxten.com` kullanılır

---

## 2. E-Fatura Test Adımları

### 2.1 Taslak Oluşturma

1. [ ] `/dashboard/efatura/olustur` sayfasına git
2. [ ] Alıcı (cari) seç – **VKN/TCKN zorunlu**
3. [ ] Ürün ekle (adet, birim fiyat, KDV)
4. [ ] Fatura türü: **E-Fatura** (TEMELFATURA)
5. [ ] XML oluştur / taslak kaydet

### 2.2 Gönderim (Test)

1. [ ] Taslak listesinden ilgili faturayı seç
2. [ ] **Gönder** butonuna tıkla
3. [ ] İstek: `POST /api/efatura/send`
4. [ ] Hedef: `https://devrest.taxten.com/api/v1/Invoice/SendUbl`
5. [ ] Başarılıysa: Gönderilen faturalar listesinde görünür

### 2.3 Kontrol Noktaları (E-Fatura)

| Kontrol | Beklenen |
|---------|----------|
| UBL şeması | UBL-TR 2.1 uyumlu |
| XSLT | GİB standart XSLT ZIP içinde |
| ZIP dosya adı | `{uuid}.xml` |
| UTF-8 BOM | Var |
| SenderIdentifier | `urn:mail:{vkn}` veya firma ayarı |
| ReceiverIdentifier | `urn:mail:{alıcıVkn}` |
| DocType | INVOICE |

---

## 3. E-Arşiv Test Adımları

### 3.1 Taslak Oluşturma

1. [ ] Fatura türü: **E-Arşiv** seç (EARSIV / EARSIVFATURA)
2. [ ] Alıcı VKN/TCKN (TCKN 11 hane de olabilir)
3. [ ] Ürün ve tutarlar gir

### 3.2 Gönderim (Test)

1. [ ] Endpoint: `POST /EArchiveInvoice/SendUbl`
2. [ ] Ek alanlar: `Branch`, `OutputType` (PDF/HTML)
3. [ ] Başarılı yanıt: uuid, fatura no

### 3.3 E-Arşiv API Route'ları

| Metod | Path | Açıklama |
|-------|------|----------|
| POST | /api/efatura/earsiv/invoice-document | PDF görüntü (uuid/invoiceNumber/custInvId) |
| POST | /api/efatura/earsiv/signed-invoice | İmzalı XML (statü ≥130) |
| POST | /api/efatura/earsiv/cancel | Fatura iptali (invoiceId/custInvId, totalAmount, cancelDate) |
| POST | /api/efatura/earsiv/envelope-status | Zarf durum sorgusu |
| POST | /api/efatura/earsiv/view | Arşiv görünümü |
| POST | /api/efatura/earsiv/ubl | UBL belge indirme |

### 3.4 Kontrol Noktaları (E-Arşiv)

| Kontrol | Beklenen |
|---------|----------|
| invoiceTypeCode | EARSIVFATURA |
| Branch | company.taxtenBranch veya "default" |
| OutputType | PDF (varsayılan) veya HTML |

---

## 4. E-İrsaliye (Planlanan)

Taxten dokümanına göre:

- Endpoint: `POST /Despatch/SendUbl`
- DocType: DESPATCH (irsaliye) / RECEIPT (yanıt)
- UBL-TR DespatchAdvice şeması

Taxten API dokümanları paylaşıldığında implementasyon yapılacak.

---

## 5. GİB Uyumluluk Kontrolü

| Alan | GİB Gereksinimi | Proje |
|------|-----------------|-------|
| UBL-TR 2.1 | Zorunlu | ✅ createUbl.js |
| XSLT eklenmesi | Faturada görüntü için zorunlu | ✅ GIB_STANDARD_XSLT_BASE64 |
| UTF-8 BOM | Türkçe karakter | ✅ createUblZip |
| Fatura ID formatı | Yıllık sıra (örn. KT-2025-000001) | ✅ Counter model |
| VKN/TCKN formatı | 10 (VKN) / 11 (TCKN) hane | ✅ createUbl validasyon |

---

## 6. Taxten Uyumluluk Kontrolü

| Alan | Taxten Gereksinimi | Proje |
|------|--------------------|-------|
| Base URL (test) | devrest.taxten.com | ✅ send.js |
| Base URL (canlı) | rest.taxten.com | ✅ send.js |
| Auth | Basic veya x-client-id + x-api-key | ✅ send.js |
| ZIP max 5MB | Limit kontrolü | ✅ createUblZip |
| XML dosya adı | {uuid}.xml | ✅ createUblZip |
| Hata kodları | Taxten error code mapping | ✅ TAXTEN_ERROR_CODES |

---

## 7. Canlıya Geçiş Öncesi

1. [ ] Tüm test adımları başarıyla tamamlandı
2. [ ] `taxtenTestMode: false` yapılacak (canlı Taxten)
3. [ ] Taxten canlı hesap bilgileri girilecek
4. [ ] GİB portalında firma/mükellef kaydı doğrulanacak
5. [ ] E-Fatura / E-Arşiv başvurusu onaylı olacak

---

## 8. Taxten Doküman Güncellemesi

**Taxten REST API** (e-Fatura, e-Arşiv, e-İrsaliye) dokümanları paylaşıldığında:

- Endpoint path’leri karşılaştırılacak
- İstek/yanıt alanları kontrol edilecek
- Eksik/kaldırılan alanlar güncellenecek
- E-İrsaliye implementasyonu eklenebilecek

Dokümanlar `docs/` altına veya bu dosyaya referans olarak eklenecek.
