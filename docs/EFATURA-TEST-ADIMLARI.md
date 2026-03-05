# E-Fatura Test Adımları

Bu dokümanda E-Fatura / E-Arşiv test ortamında deneme yapmak için izlenecek adımlar özetlenir.

---

## Ön koşullar

- **MongoDB** çalışıyor olmalı (`MONGODB_URI` .env'de tanımlı).
- **.env** içinde `JWT_SECRET`, gerekirse Taxten test ortamı için `TAXTEN_BASE_URL`, `TAXTEN_TEST_CLIENT_ID`, `TAXTEN_TEST_API_KEY` (admin onayında yeni hesap açmak için).

---

## 1. Uygulamayı çalıştır

```bash
npm run dev
```

Tarayıcıda: **http://localhost:3000**

---

## 2. Giriş yap

- Giriş sayfasından kullanıcı adı/şifre ile giriş yap (veya kayıt ol).
- Token localStorage’a yazılır; E-Fatura sayfaları bu token ile çalışır.

---

## 3. Firma ayarlarını kontrol et

- **Ayarlar → Firma Ayarları** (veya `/dashboard/ayarlar/firma`) sayfasına git.
- **Firma adı**, **VKN/TCKN** (vergiNo), **Vergi dairesi**, **Adres**, **Telefon**, **E-posta** dolu olsun.
- E-Fatura test için bu firma bilgileri faturada “gönderen” olarak kullanılır.

---

## 4. E-Fatura erişimini kontrol et

- **E-Fatura Paneli** ana sayfasına git: `/dashboard/efatura`
- “Erişim yok” uyarısı çıkıyorsa:
  - **E-Fatura Başvurusu** yap: `/dashboard/edonusum/efatura-basvuru`
  - Adımları tamamla (modül seçimi, firma bilgileri, logo/imza, onay).
  - Admin kullanıcı ile başvuruyu **onayla** (admin panel veya `efatura_applications` koleksiyonunda status: "approved" + Taxten bilgileri firma ayarlarına yazılmış olmalı).
  - Veya test için `company_settings` kaydına manuel olarak Taxten test bilgilerini ekle:
    - `efatura.taxtenClientId`, `efatura.taxtenApiKey` (Taxten test hesabından)
    - veya `taxtenUsername`, `taxtenPassword` (Basic Auth)

---

## 5. Taslak oluştur

- **E-Fatura Oluştur**: `/dashboard/efatura/olustur`
- **Cari seç** (alıcı; VKN/TCKN’si olan bir cari).
- **Ürün ekle**, adet/fiyat gir, **XML Oluştur** ile taslak kaydedilir veya doğrudan **Taslak Faturalar** sayfasından yeni taslak oluştur.
- Alternatif: **Yeni Fatura** / **Taslak** sayfası varsa oradan taslak oluştur.

---

## 6. Taslağı Taxten test ortamına gönder

- **Taslak Faturalar** listesinden ilgili taslağı seç.
- **Gönder** (veya “Taxten’a gönder”) butonuna tıkla.
- İstek `POST /api/efatura/send` ile gider; Taxten **test** URL’i kullanılır: `https://devrest.taxten.com/api/v1`.
- Başarılıysa fatura **Gönderilen Faturalar** listesinde görünür.

---

## 7. Kontrol listesi

| Adım | Beklenen |
|------|----------|
| Firma ayarları | vergiNo, firmaAdi dolu |
| E-Fatura erişim | allowed: true veya başvuru onaylı |
| company_settings | efatura.taxtenClientId + taxtenApiKey veya taxtenUsername + taxtenPassword |
| Taslak | Alıcı VKN/TCKN (customer.vknTckn / identifier) dolu |
| Gönderim | Test ortamı (devrest.taxten.com), 200 OK veya Taxten’dan dönen yanıt |

---

## Hata alırsan

- **“Firma ayarları eksik”** → Firma ayarlarında VKN ve iletişim bilgilerini doldur; giriş yaptığın kullanıcının firmasına ait `company_settings` kaydı olmalı.
- **“Taxten API bilgisi yok”** → Bu firma için `company_settings` içinde Taxten kimliği (ClientId+ApiKey veya username+password) tanımlı olmalı; gerekirse başvuru onayı veya manuel kayıt.
- **“Alıcı VKN/TCKN eksik”** → Taslaktaki cari/müşteri için VKN veya TCKN girilmiş olmalı.
- **401 / 403 Taxten’dan** → Test hesabı bilgilerini ve test ortamı URL’ini (devrest) kontrol et.

Testlere bu adımlarla başlayabilirsiniz.
