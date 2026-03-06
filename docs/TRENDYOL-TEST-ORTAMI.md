# Trendyol Test (Stage) Ortamı

Test ortamı için ortak test hesabını kullanabilir veya kendi test hesabınızı oluşturabilirsiniz.

---

## ⚠️ Eski servis endpoint’leri kapatıldı (Trendyol resmî duyurusu)

**Trendyol’un paylaştığı resmî açıklama:**

> Değerli İş Ortağımız,
>
> İlk olarak 4 Şubat 2025 tarihinde çıkmış olduğumuz duyuru içeriğince (sonrasında 10 Şubat 2025, 25 Şubat 2025, 3 Nisan 2025, 20 Mayıs 2025 ve 22 Mayıs 2025 tarihlerinde duyurusu çıkılan), eski servis endpointlerimiz 26 Mayıs tarihi ile kapatılması planlanmaktaydı. Satıcılarımızın ve entegratörlerimizin geçişi tamamlaması için ek süre tanımlanmış olup **7 Temmuz itibari ile eski servis endpointlerimiz kapatılmış bulunmaktadır.**
>
> Yeni servis endpointlerimize entegrasyon dökümanımız üzerinden ulaşabilirsiniz. Servis dökümanımız: **https://developers.trendyol.com/**
>
> Saygılarımızla  
> Trendyol Ekibi

**Ne yapmalısınız?**

- Ekran hataları veya “bağlantı kurulamadı” benzeri sorunlar **eski API adreslerinin kapatılmasından** kaynaklanıyor olabilir.
- **Güncel base URL ve path’leri** mutlaka **https://developers.trendyol.com/** adresindeki resmî dokümandan kontrol edin.
- Bu projede kullanılan adresler `lib/marketplaces/trendyolConfig.js` içinde ve `.env` / paneldeki **TRENDYOL_BASE_URL** ile tanımlıdır. Trendyol dokümanında farklı bir base URL (veya path yapısı) belirtilmişse, bu dosyayı ve ortam değişkenlerinizi buna göre güncelleyin.

---

## Ortak test hesabı

| Bilgi | Değer |
|-------|--------|
| **SupplierID** | `2738` |
| **Stage panel giriş** | https://stagepartner.trendyol.com/account/login |
| **E-posta** | `mpentegrasyon@entegrasyon.com` |
| **Şifre** | `Trendyol123!` |

Güncel API (developers.trendyol.com) base adresleri:
- **Test (Stage):** `https://stageapigw.trendyol.com/integration`
- **Canlı:** `https://apigw.trendyol.com/integration`

Örnek sipariş listesi endpoint’i:
```
GET https://stageapigw.trendyol.com/integration/order/sellers/2738/orders?status=Created&startDate=...&endDate=...
```

API Key ve API Secret bilgilerine **Stage panel** → **Hesap Bilgilerim** bölümünden ulaşabilirsiniz (giriş yaptıktan sonra).

## IP kısıtlaması (Stage / Test ortamı)

Trendyol **test (stage) ortamında** API erişimi için **IP yetkilendirmesi** isteyebilir. Bu yüzden:

- **Yerel bilgisayarınızdan** (localhost veya ev/ofis IP’niz) çağrı yapıyorsanız ve API’den **HTML veya 403/401** alıyorsanız, büyük ihtimalle IP’niz stage için tanımlı değildir.
- **Ne yapabilirsiniz?**
  1. **Trendyol entegrasyon ekibi:** [entegrasyon@trendyol.com](mailto:entegrasyon@trendyol.com) adresine stage kullanacağınız **sunucu veya sabit IP** adresinizi ileterek IP’nizi beyaz listeye aldırın.
  2. **Canlı ortam:** Canlı API’de (production) genelde IP kısıtlaması yoktur; sadece test ortamında sık görülür. Önce canlı panelden API bilgilerinizi alıp canlı endpoint ile deneyebilirsiniz (gerçek sipariş/ürün oluşturmamak için dikkatli test edin).
  3. **Sabit IP’li sunucu:** Uygulamanızı Render, AWS, vb. sabit IP’li veya Trendyol’un tanıdığı bir sunucuda çalıştırıp oradan API çağrısı yapmak; Trendyol’a bu sunucu IP’sini bildirerek yetkilendirme talep etmek.

**Stage panele girişte "Sorry, you have been blocked" (Cloudflare):** Stage partner sayfası (`stagepartner.trendyol.com`) Cloudflare ile erişimi kısıtlıyor olabilir. Sabit IP yoluna geçince API çağrıları sunucudan gideceği için panel engeli API’yi etkilemez.

---

## Sabit IP ile ilerleme (önerilen yol)

Stage ortamında başka yol kalmadığında **sabit IP** ile ilerleyin:

1. **Sabit IP’yi belirleyin**
   - Uygulama **Render**’da çalışıyorsa: Render’ın çıkış IP’lerini (outbound IP) alın veya Trendyol’a “Render’dan çıkış yapıyoruz” diye yazıp Render’ın kullandığı IP aralığını yetkilendirmelerini isteyin.
   - İsterseniz **VPS / sunucu** (AWS, DigitalOcean, vb.) kullanıp oradaki sabit IP’yi bildirin.

2. **Trendyol’a bildirin**
   - **entegrasyon@trendyol.com** adresine e-posta atın.
   - Konu: Stage API erişimi / IP yetkilendirmesi.
   - Metinde: Kullandığınız **sabit IP adresi(leri)** veya “Render kullanıyoruz, outbound IP’lerinizi paylaşın” deyin; Supplier ID (örn. 2738) ve test hesabı kullandığınızı yazın.

3. **Yetkilendirme sonrası**
   - API çağrıları bu sabit IP’den gideceği için uygulamayı **Render’a deploy** edin (veya ilgili sunucuda çalıştırın).
   - Dashboard → API Ayarları → Trendyol’da kayıtlı API Key/Secret ile **Bağlantıyı test et** ve **Trendyol Siparişleri / Ürünleri** sayfalarını kullanın.

Özet: Stage için **sabit IP yetkilendirmesi** şart; IP’yi Trendyol’a bildirip onay aldıktan sonra aynı IP’den çıkış yapan sunucuda (Render vb.) test edin.

## Kendi test hesabınız

https://stagepartner.trendyol.com/onboarding/satici-formu üzerinden kendi test satıcı hesabınızı oluşturabilirsiniz. API bilgileri yine panelde **Hesap Bilgilerim**’den alınır.

## Trendyol bilgilerini nereden girebilirsiniz?

- **Dashboard → API Ayarları → Trendyol:** Supplier ID, API Key, API Secret buradan girilir ve veritabanında saklanır. **.env tanımlamak zorunlu değildir**; sadece panelden girmeniz yeterli.
- **.env / Render:** İsterseniz ortam değişkeni olarak da tanımlayabilirsiniz; env varsa öncelik env’e verilir.

Stage ortamı için örnek ayarlar (isteğe bağlı):

```env
# Trendyol – Test (Stage) ortamı (güncel API: developers.trendyol.com)
TRENDYOL_SUPPLIER_ID=2738
TRENDYOL_API_KEY=    # Hesap Bilgilerim'den alın
TRENDYOL_API_SECRET= # Hesap Bilgilerim'den alın
TRENDYOL_BASE_URL=https://stageapigw.trendyol.com/integration
TRENDYOL_USER_AGENT=SatisTakip/1.0
# TRENDYOL_STORE_FRONT_CODE=  # Bazı sipariş API'leri için gerekebilir (panelden alınır)
```

- **TRENDYOL_BASE_URL** verilmezse uygulama varsayılan olarak **stage** adresini kullanır: `https://stageapigw.trendyol.com/integration`.
- Canlı ortama geçerken: `TRENDYOL_BASE_URL=https://apigw.trendyol.com/integration` ve SupplierID / API Key / Secret’ı canlı panelden güncelleyin.
- Trendyol sürekli API güncellemesi yaptığı için güncel endpoint’ler için [developers.trendyol.com](https://developers.trendyol.com) takip edin.

## Panel ayarları

Uygulama içinde **Dashboard → API Ayarları → Trendyol** sekmesinden de Supplier ID, API Key ve API Secret girilebilir. Bu değerler veritabanında saklanır; ortam değişkenleri yoksa buradaki değerler kullanılır.

## 401 Unauthorized / TrendyolAuthorizationException

Render veya canlıda **401** veya **TrendyolAuthorizationException** alıyorsanız bu **kimlik doğrulama** hatasıdır (IP değil):

- **API Key** ve **API Secret** yanlış, süresi dolmuş veya başka bir hesaba ait olabilir.
- **Yapmanız gerekenler:**
  1. **Stage kullanıyorsanız:** https://stagepartner.trendyol.com/account/login → **Hesap Bilgilerim** → API Key ve API Secret’ı **baştan kopyalayın** (boşluk/eksik karakter olmasın).
  2. **Canlı kullanıyorsanız:** Canlı satıcı paneli → Hesap Bilgilerim’den API bilgilerini alın.
  3. **Dashboard → API Ayarları → Trendyol** bölümüne bu değerleri yapıştırıp kaydedin. Supplier ID’nin de (örn. 2738) doğru olduğundan emin olun.
  4. Tarayıcıda sayfayı yenileyip tekrar deneyin.

## Bağlantı testi

- **Panelden:** API ayarlarını kaydettikten sonra **Trendyol bağlantı testi** butonu ile `/api/trendyol/test-connection` çağrılır.
- **Komut satırından:** Proje kökünde `npm run test:trendyol` çalıştırın. Bu script:
  - Kullanılan base URL’yi (stage/canlı) kontrol eder,
  - Örnek endpoint’leri listeler,
  - `.env` / `.env.local`’de `TRENDYOL_SUPPLIER_ID`, `TRENDYOL_API_KEY`, `TRENDYOL_API_SECRET` varsa Trendyol’a gerçek bir GET isteği atar.
  - Sadece URL kontrolü için: `npm run test:trendyol -- --url-only`
- Başarılı olursa sipariş listesi ve diğer Trendyol sayfaları stage API ile çalışır.
- Test ortamında bağlantı başarısız veya “HTML yanıt” alıyorsanız büyük olasılıkla **IP kısıtlaması** vardır; yukarıdaki “IP kısıtlaması” bölümüne bakın.
- **401 / Yetki hatası** alıyorsanız yukarıdaki “401 Unauthorized” bölümüne bakın.

## Entegrasyon dokümanı

Resmî Trendyol entegrasyon dokümanı ve ilgili sayfalar:

| Sayfa | URL |
|-------|-----|
| **Entegrasyon servislerine genel bakış (Getting Started)** | [developers.trendyol.com/docs/getting-started](https://developers.trendyol.com/docs/getting-started) |
| **Canlı / Test ortam bilgileri** (base URL’ler) | Doküman içinde *3. Canlı-Test Ortam Bilgileri* bölümü |
| **Authorization** | Doküman içinde *2. Authorization* |
| **Ana doküman** | [developers.trendyol.com](https://developers.trendyol.com) |
| **4. Duyurular** | [developers.trendyol.com/docs/4-duyurular](https://developers.trendyol.com/docs/4-duyurular) |

Güncel base URL ve path’ler için **Getting Started** veya **Canlı-Test Ortam Bilgileri** sayfasını kullanın.

---

## 4. Duyurular (resmî)

Trendyol’un tüm entegrasyon duyuruları (base URL değişikliği, yeni alanlar, kaldırılan alanlar, test siparişi endpoint’i vb.) şu sayfadan takip edilir:

- **[4. Duyurular](https://developers.trendyol.com/docs/4-duyurular)**

Önemli duyuruların özeti:

| Tarih | Konu | Özet |
|-------|------|------|
| 26.05.2025 | Base URL değişikliği | Eski servisler 26 Mayıs sonu itibariyle kapatılmaya başlandı. Yeni endpoint’ler için [developers.trendyol.com](https://developers.trendyol.com) kullanılmalı. |
| 07.07.2025 | Eski endpoint’ler kapatıldı | (E-posta ile paylaşılan duyuru) 7 Temmuz itibarıyla eski servis endpoint’leri kapatıldı. |
| 08.12.2025 | Sipariş paketleri (getShipmentPackages) | Response’a yeni alanlar eklendi; bazı alan isimleri değişti (örn. `merchantId` → `sellerId`, `productCode` → `contentId`). Eski alan isimleri 1 ay sonra kaldırılacak. |
| 27.12.2024 | Test siparişi endpoint’i | **Test Siparişi Oluşturma** servisi için endpoint değişti. Yeni adres: `https://stageapi.trendyol.com/integration/order/orders/core` (stage ortamı için **stageapi**, diğer entegrasyonlar için **stageapigw** kullanılıyor). |

Duyurularda geçen tüm alan ve endpoint değişiklikleri için yukarıdaki Duyurular sayfasını inceleyin.

---

## Test için kullanılan endpoint’ler (bu proje)

Bu projede Trendyol API çağrıları **yeni base URL** üzerinden yapılıyor (eski servisler kapatıldığı için doğru adresler kullanılıyor):

| Ortam | Base URL | Kullanım |
|-------|----------|----------|
| **Test (Stage)** | `https://stageapigw.trendyol.com/integration` | Sipariş listesi, sipariş detay, kargo bildirimi, ürün listesi, fiyat/stok, kategori attribute |
| **Canlı** | `https://apigw.trendyol.com/integration` | Aynı path’ler, canlı ortam |

Tanımlı path’ler (`lib/marketplaces/trendyolConfig.js`):

- `GET /order/sellers/{sellerId}/orders` — sipariş listesi
- `GET /order/sellers/{sellerId}/orders?orderNumber=...` — sipariş detay
- `POST /order/sellers/{sellerId}/shipment-packages` — kargo bildirimi
- `GET /product/sellers/{sellerId}/products` — ürün listesi
- `POST /product/sellers/{sellerId}/products` — ürün oluşturma
- `GET /product/product-categories/{categoryId}/attributes` — kategori özellikleri
- `POST /inventory/sellers/{sellerId}/products/price-and-inventory` — fiyat/stok güncelleme

**Test siparişi oluşturma:** Trendyol duyurusuna göre bu işlem için ayrı endpoint kullanılıyor: `https://stageapi.trendyol.com/integration/order/orders/core`. Bu projede şu an test siparişi oluşturma çağrısı yok; ileride eklenecekse bu base URL kullanılmalı.

## Özet

1. **Güncel API:** Eski endpoint'ler 7 Temmuz 2025 itibarıyla kapatıldı. Base URL ve path'leri **https://developers.trendyol.com/** üzerinden güncelleyin.
2. Stage panele giriş yapın (yukarıdaki e-posta/şifre veya kendi hesabınız).
3. **Hesap Bilgilerim**’den API Key ve API Secret alın.
4. `.env` veya Render’da `TRENDYOL_SUPPLIER_ID`, `TRENDYOL_API_KEY`, `TRENDYOL_API_SECRET`, `TRENDYOL_BASE_URL`, `TRENDYOL_USER_AGENT` tanımlayın (stage için `TRENDYOL_BASE_URL` dokümandaki güncel adrese göre).
5. Panelde **API Ayarları → Trendyol**’da da aynı bilgileri girebilirsiniz.
6. Bağlantı testi ile kontrol edin.
