# İdefix Soru-Cevap Entegrasyonu

Bu doküman İdefix satıcılarına ait **müşteri sorularının çekilmesi**, **filtrelenmesi** ve **yanıtlanması** için entegre edilmesi gereken servisleri özetler. Detaylı path ve parametreler için İdefix geliştirici dokümantasyonuna bakınız.

**Üç ana başlık:**
1. **Müşteri sorularının tamamını çekme** — Satıcıya gelen soruların listelenmesi.
2. **Müşteri sorusu filtreleme** — Tarih, ürün, durum vb. kriterlere göre sorgulama.
3. **Yanıtlama** — Soruya cevap gönderme.

---

## 1. Müşteri Sorularının Alınması (question/filter)

- **GET** `pim/vendor/{vendorId}/question/filter` — Satıcıya yöneltilen tüm müşteri sorularının listesi. **PIM** endpoint’i kullanılır.

### Parametreler

| Parametre | Açıklama |
|-----------|----------|
| vendor * | Satıcı ID (zorunlu). Projede creds’tan alınır. |
| page | Sayfa numarası (varsayılan: 1). |
| limit | Sayfa başına kayıt (varsayılan: 10, maksimum: 50). |
| barcode | Belirli barkoda ait sorular. |
| startDate | Bu tarihten sonraki sorular. **Timestamp (milisaniye)**. |
| endDate | Bu tarihe kadar olan sorular. **Timestamp (milisaniye)**. |
| sort | Sıralama: `newest` \| `oldest` (varsayılan: newest). |

### Yanıt (özet)

Her öğe: **id**, **product** (ürün adı), **question** (soru metni), **productQuestionAnswer** (cevaplar: id, answerBody, likeCount, dislikeCount, bannedWords), **readAt**, **publishedAt**, **createdAt**, **isArchived**, **customerId**, **customerName**, **showMyName**.

**Projede:** `idefixGetQuestionFilter(creds, params)` ✅ | API: `GET /api/idefix/questions/filter` ✅ (query: page, limit, barcode, startDate, endDate, sort)

---

## 2. Ürün Sorusunu ID ile Çekme (vendor-question)

- **GET** `pim/vendor/{vendorId}/question/{questionId}` — Tek bir soruyu **id** bazında getirir. **PIM** endpoint’i.

### Parametreler

| Parametre   | Açıklama |
|------------|----------|
| vendor *   | Satıcı ID (path’te; creds’tan). |
| questionId * | Soru ID (path’te; question/filter veya list’ten). |

### Yanıt

- **totalCount**, **itemCount**, **pageCount**, **currentPage**, **limit** — Sayfalama bilgisi.
- **items[]** — Soru objesi (id, product, question, productQuestionAnswer, readAt, publishedAt, createdAt, isArchived, customerId, customerName, showMyName).

**Projede:** `idefixGetQuestionById(creds, questionId)` ✅ | API: `GET /api/idefix/questions/[questionId]` ✅

---

## 3. Soru Filtreleme (question/filter parametreleri)

- Filtreleme **question/filter** servisinin query parametreleri ile yapılır: **barcode** (ürün), **startDate** / **endDate** (tarih aralığı, ms), **sort** (newest/oldest). Cevaplanmış/cevaplanmamış ayrımı yanıttaki **productQuestionAnswer** dizisinin boş/dolu olmasıyla yapılabilir.

---

## 4. Müşteri Sorularının Cevaplanması (question-answer)

- **POST** `pim/vendor/{vendorId}/question/{questionId}/answer` — Ürün sorusuna cevap gönderilir. **PIM** endpoint’i.

### Parametreler

| Parametre   | Açıklama |
|------------|----------|
| vendor *   | Satıcı ID (path’te; creds’tan). |
| questionId * | Cevaplanacak soru ID (path’te). |
| answer_body * | Cevap metni (body). |

### İstek / Yanıt

- **Body:** `{ "answer_body": "string" }`
- **Yanıt:** `{ id, answerBody, likeCount, dislikeCount, bannedWords }`

**Projede:** `idefixAnswerQuestion(creds, questionId, answerBody)` ✅ | API: `POST /api/idefix/questions/[questionId]/answer` ✅ (body: answer_body)

---

## Özet Tablo

| Başlık           | Açıklama                          | Proje durumu     |
|------------------|-----------------------------------|------------------|
| Soru listesi / filtre | GET pim/vendor/{vendorId}/question/filter | ✅ idefixGetQuestionFilter + API route |
| Ürün sorusu (id ile) | GET pim/vendor/{vendorId}/question/{questionId} | ✅ idefixGetQuestionById + API route |
| Soru yanıtlama   | POST pim/vendor/{vendorId}/question/{questionId}/answer | ✅ idefixAnswerQuestion + API route |
