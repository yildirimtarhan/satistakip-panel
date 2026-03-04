# Taxten REST API – Uyumluluk Özeti (PDF Dokümanlara Göre)

Taxten **e-Fatura**, **e-Arşiv** ve **e-İrsaliye** REST API PDF dokümanlarına göre proje kodu karşılaştırıldı ve gerekli düzeltmeler yapıldı.

---

## 1. Taxten Dokümanı Özeti

### 1.1 Ortak ayarlar (üç ürün)

| Ayar | Değer |
|------|--------|
| Base URL (Test) | `https://devrest.taxten.com/api/v1` |
| Base URL (Canlı) | `https://rest.taxten.com/api/v1` |
| Kimlik doğrulama | **HTTPS – HTTP Basic Authentication** |
| Zaman aşımı önerisi | 5 dakika |
| İmza | Dışarıdan imzalı belge kabul edilmez; imza entegratör tarafında atılır. |

---

### 1.2 E-Fatura

| Öğe | Taxten dokümanı | Proje (send.js) |
|-----|------------------|------------------|
| **Gönderim** | `POST /Invoice/SendUbl` | ✅ Aynı path kullanılıyor |
| İstek alanları | VKN_TCKN, SenderIdentifier (ops.), ReceiverIdentifier (ops.), DocType, Parameters, DocData | ✅ Hepsi gönderiliyor |
| Zarfsız gönderim | SenderIdentifier / ReceiverIdentifier **zorunlu** | ✅ Her zaman gönderiliyor |
| ZIP kuralı | Zip içindeki **tek XML dosyasının adı ilgili UUID ile aynı** olmalı | ✅ `createUblZip` → `{uuid}.xml` |
| XSLT | **Tüm fatura gönderimlerinde** UBL XML’e XSLT eklenmeli; aksi halde alıcı/GİB görüntüleyemez | ⚠️ Şu an UBL’de XSLT yok – eklenmeli (aşağıda not) |

---

### 1.3 E-Arşiv

| Öğe | Taxten dokümanı | Proje (send.js) |
|-----|------------------|------------------|
| **Gönderim** | `POST /EArchiveInvoice/SendUbl` | ✅ E-Arşiv için bu path kullanılıyor |
| Ek alanlar | **Branch**, **OutputType** (PDF, HTML) | ✅ E-Arşiv isteğinde Branch + OutputType ekleniyor |
| DocType | ENVELOPE, INVOICE, APP_RESP | ✅ Fatura için INVOICE |

Taslakta `invoiceType` EARSIV / EARSIVFATURA ise artık **EArchiveInvoice/SendUbl** çağrılıyor; Branch (opsiyonel) ve OutputType (varsayılan PDF) gönderiliyor.

---

### 1.4 E-İrsaliye

| Öğe | Taxten dokümanı | Proje |
|-----|------------------|--------|
| **Gönderim** | `POST /Despatch/SendUbl` | ❌ Henüz kullanılmıyor |
| DocType | ENVELOPE, **DESPATCH** (irsaliye), **RECEIPT** (irsaliye yanıtı) | – |
| İstek alanları | VKN_TCKN, SenderIdentifier, ReceiverIdentifier, DocType, Parameters, DocData | – |

E-İrsaliye gönderimi ileride eklenecekse endpoint:  
`https://devrest.taxten.com/api/v1/Despatch/SendUbl` (test) / `https://rest.taxten.com/api/v1/Despatch/SendUbl` (canlı).

---

## 2. Yapılan Kod Değişiklikleri

### 2.1 `pages/api/efatura/send.js`

- **E-Fatura vs E-Arşiv ayrımı:**  
  - E-Fatura: `POST {baseUrl}/Invoice/SendUbl`  
  - E-Arşiv: `POST {baseUrl}/EArchiveInvoice/SendUbl`  
  Taslak `invoiceType` değeri EARSIV içeriyorsa E-Arşiv endpoint’i kullanılıyor.
- **E-Arşiv istek gövdesi:**  
  - `Branch`: `company.taxtenBranch || company.branch || ""`  
  - `OutputType`: `company.taxtenOutputType || "PDF"`
- ZIP açıklaması: “Zip içindeki tek XML dosyasının adı UUID ile aynı olmalı” kuralına uygunluk yorum satırında belirtildi.

### 2.2 Diğer düzeltmeler (önceki oturumdan)

- **access.js:** `efatura_applications` sorgusu `userId` (string) ile yapılıyor.
- **send.js:** `receiverIdentifier` / gönderici VKN kontrolü, `invoiceNumber` / `issueDate` üretimi.
- **createUbl.js:** `customer.vknTckn || customer.identifier`, `company.vkn || company.vknTckn`.

---

## 3. XSLT Uyarısı (E-Fatura / E-Arşiv)

Taxten e-Fatura dokümanı:

> “sendUBL() metoduyla yapılacak **tüm fatura zarfı ve fatura gönderimlerinde** fatura UBL XML’lerine **XSLT dosyaları eklenmelidir**, aksi taktirde alıcı sistem ve GİB e-Fatura Görüntüleyici faturayı görüntüleyemeyecektir.”

Şu an `lib/efatura/createUbl.js` içinde XSLT eklenmiyor. İleride:

- GİB standart XSLT’si veya kendi XSLT’nizi UBL’de `AdditionalDocumentReference` (DocumentTypeCode: XSLT, filename: `FaturaID.xslt`) ile eklemeniz önerilir.
- E-Arşiv’de de benzer kural geçerli; dokümanda XSLT ile görüntü üretimi anlatılıyor.

---

## 4. Özet Tablo – Taxten SendUbl Endpoint’leri

| Belge türü | Endpoint path | DocType (fatura/irsaliye) |
|------------|----------------|----------------------------|
| E-Fatura | `/Invoice/SendUbl` | INVOICE |
| E-Arşiv | `/EArchiveInvoice/SendUbl` | INVOICE (+ Branch, OutputType) |
| E-İrsaliye | `/Despatch/SendUbl` | DESPATCH / RECEIPT |

Tüm isteklerde: **VKN_TCKN**, **SenderIdentifier**, **ReceiverIdentifier** (zarfsızda zorunlu), **DocType**, **Parameters**, **DocData** (ZIP Base64). Auth: **Basic** (taxtenUsername:taxtenPassword).
