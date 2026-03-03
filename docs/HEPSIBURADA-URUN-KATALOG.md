# Hepsiburada Ürün Katalog ve Ürün Gönderme

Bu doküman, Hepsiburada **katalog / ürün gönderme** akışını ve resmi dokümantasyonla mevcut kodu karşılaştırır. Eksik veya farklı alanlar listelenir.

---

## 1. Hepsiburada’da İki Tür Ürün Akışı (Resmi)

| Akış | Ne zaman? | Endpoint (test) | Zorunlu alanlar (özet) |
|------|-----------|------------------|-------------------------|
| **Hızlı Ürün Yükleme** | Ürün zaten HB kataloğunda + global barkod var | `POST https://mpop-sit.hepsiburada.com/product/api/products/fastlisting` | merchant, merchantSku, productName |
| **Ürün Bilgisi Gönderme** | İlk defa açılacak, kataloğunda olmayan ürünler | JSON dosya / API ile gönderim (aşağıda alanlar) | categoryId, merchant, attributes, merchantSku, UrunAdi, Barcode, Marka, GarantiSuresi, kg, price, stock, görseller |

Kaynak: [Hepsiburada Developer – Katalog Önemli Bilgiler](https://developers.hepsiburada.com/hepsiburada/reference), [Hızlı Ürün Yükleme](https://developers.hepsiburada.com/hepsiburada/reference/uploadfastlistingproduct).

---

## 2. Resmi “Ürün Bilgisi Gönderme” – İstek Alanları (JSON)

Aşağıdaki tablo, Hepsiburada katalog referansındaki **Ürün Bilgisi Gönderme** metodunda belirtilen alanlardır.

| Alan | Data tipi | Açıklama |
|------|-----------|----------|
| categoryId | integer | Ürünün kategori ID’si (leaf ve available kategori) |
| merchant | string | Merchant ID |
| attributes | Object | Kategoriye ait özellik değerleri (kart türü, kapasite vb.) |
| merchantSku | string | Satıcı stok kodu |
| VaryantGroupID | string | Varyant gruplama (opsiyonel) |
| UrunAdi | string | Ürün adı |
| UrunAciklamasi | string | Ürün açıklaması |
| Barcode | string | EAN13 barkod |
| Marka | string | Marka |
| GarantiSuresi | integer | Garanti süresi (ay) |
| kg | string | Ağırlık / desi |
| price | string | Fiyat |
| stock | string | Stok |
| Image1, Image2, Image3, Image4, Image5 | string | Görsel URL’leri |
| Video1 | string | Video URL (MP4, opsiyonel) |
| attribute-n | string | Diğer özellikler (Renk, Beden vb.) |

**Kategori:** Sadece `leaf: true` ve `available: true` olan kategorilere ürün açılabilir. Ürün göndermeden önce **kategori ağacı**, **kategori özellikleri** ve **özellik değerleri** API’den alınmalıdır.

---

## 3. Projede Kullanılan Akış

### 3.1 Tek ürün gönder (Pazaryeri Gönder → Hepsiburada)

- **Sayfa:** `dashboard/pazaryeri-gonder.js` (Hepsiburada sekmesi)
- **API:** `POST /api/hepsiburada/products/create`
- **Backend:** `pages/api/hepsiburada/products/create.js`
- **Test ortamı (mpop-sit):** `POST {baseUrl}/product/api/products/fastlisting` — **Hızlı Ürün Yükleme**. Test hesabında `listings` 404 döndüğü için otomatik olarak bu endpoint kullanılır. Body: `[{ merchant, merchantSku, productName, barcode?, stock?, price? }]`. Ürünün HB kataloğunda ve barkodunun kayıtlı olması gerekir.
- **Canlı ortam:** `POST {baseUrl}/product/api/v1/listings` (listings API varsa).

**Gönderilen body (listings / canlı):**

| Alan | Kaynak | Not |
|------|--------|-----|
| name | product.title / productName | UrunAdi karşılığı |
| brand | product.brandName / brand | Marka karşılığı |
| barcode | product.barcode / stockCode | Barcode karşılığı |
| categoryId | product.categoryId | Kategori |
| attributes | product.hbAttributes (dizi: { attributeId, value }) | Kategori özellikleri |
| listPrice, salePrice | product.listPrice, product.price | Fiyat |
| vatRate | product.vatRate | KDV |
| stock | product.stock / quantity | Stok |
| cargoCompanyId | Sabit: 1 | Tek kargo kodu |
| desi | product.dimensionalWeight | kg/desi karşılığı |
| images | product.images (URL dizisi) | Görseller |

**Header:** `Authorization` (Basic), `Content-Type`, `Accept`, `User-Agent`, `merchantid` (Merchant ID).

### 3.2 Toplu sync (HB Ürünleri sayfası)

- **API:** `POST /api/hepsiburada-api/catalog/sync`
- **Backend:** `pages/api/hepsiburada-api/catalog/sync.js`
- **Endpoint:** `POST https://mpop-sit.hepsiburada.com/product/api/v1/listings`
- Auth: `HEPSIBURADA_AUTH` + `User-Agent` (env). Şu an **multi-tenant değil** (şirket bazlı ayar yok).

Sync’te gönderilen alanlar: name, brand, barcode, categoryId, attributes (sabit “Standart”), listPrice, salePrice, vatRate, stock, cargoCompanyId, desi. Görsel yok; kategori özellikleri sabit.

### 3.3 Tüm katalog, marka / model / kapasite, listing listesi (test + canlı)

Panel: **Hepsiburada → HB Ürünleri**. Auth: Bearer token (şirket bazlı `getHBSettings`).

| Ne | API | Açıklama |
|----|-----|----------|
| **Tüm katalog** | `GET /api/hepsiburada/catalog/all-products?page=0&size=100` | Mağaza bazlı tüm ürünler: merchantSku, hbSku, variantGroupId, brand, productName, categoryId, status, productAttributes, variantTypeAttributes, baseAttributes. HB: `GET .../product/api/products/all-products-of-merchant/{merchantId}` (sadece katalog entegrasyonundan yüklenenler). |
| **Marka / model / kapasite** | `GET /api/hepsiburada/catalog/brands?withAttributes=1` | Katalogdan unique marka listesi; `withAttributes=1` ile model, kapasite ve diğer özellik değerleri (productAttributes/baseAttributes/variantTypeAttributes üzerinden). |
| **Listing listesi** | `GET /api/hepsiburada/listings/list?page=0&size=50` | Fiyat, stok, kargo, merchantSku, hepsiburadaSku (Listeleme Entegrasyonu). Test: `listing-external-sit.hepsiburada.com`; canlı: `listing-external.hepsiburada.com`. İsteğe bağlı env: `HEPSIBURADA_LISTING_BASE_URL`. **401:** Listing API, Basic Auth kullanıcı adı ile URL merchantId’nin aynı olmasını ister; kod artık auth’tan merchantId türetiyor. Panelde Merchant ID’yi Auth’taki ile birebir aynı yazın (ör. 4809 vs 4800 hatası). |

---

### 3.4 Kategori özellikleri (Kapasite, Kart Tipi, Uyumluluk vb.)

**API:** `GET /api/hepsiburada/categories/attributes?categoryId={categoryId}`  
**Backend:** `pages/api/hepsiburada/categories/attributes.js`

Hepsiburada resmi dokümanına göre:

- **Kategori Özelliklerini Alma:** `GET .../product/api/categories/{categoryId}/attributes?version=2`  
  Yanıt: `baseAttributes`, `attributes`, `variantAttributes` (her biri `id`, `name`, `mandatory`, `type`, `multiValue`). Özellik listesi **değer (values) içermez**.
- **Özellik Değerini Alma (enum):** `type` değeri `enum` olan özellikler için:  
  `GET .../product/api/categories/{categoryId}/attribute/{attributeId}/values?version=5&page=0&size=1000`  
  Yanıt: kullanılabilir değer listesi (id, value).

Kod bu iki adımı uygular: tüm listeyi `baseAttributes` + `attributes` + `variantAttributes` birleştirir; enum tipindeki her özellik için values endpoint'i çağrılıp sonuçlar eklenir. Böylece Kapasite, Kart Tipi, Uyumluluk vb. hem listede görünür hem dropdown'da seçenekler dolar.

---

## 4. Eksik veya Farklı Olanlar (Ürün Gönderme)

Resmi “Ürün Bilgisi Gönderme” ve listeleme dokümanlarına göre aşağıdakiler eksik veya farklı:

| Alan | Resmi durum | Projedeki durum | Öneri |
|------|-------------|------------------|--------|
| **UrunAciklamasi / description** | İstekte var | Listings body’de yok | Body’e `description` eklenmeli (ürün açıklaması). |
| **GarantiSuresi** | Zorunlu (ay) | Formda var, body’e gönderilmiyor | Body’e `guaranteePeriod` (veya API’nin beklediği isim) eklenmeli. |
| **merchant** | Zorunlu | Sadece header’da `merchantid` | Listings API header’dan alıyor olabilir; hata alınırsa body’e de eklenebilir. |
| **merchantSku** | Zorunlu | Frontend’de stockCode var, body’de name/barcode vb. var; merchantSku ayrı yok | Listings API’nin merchantSku istiyorsa body’e `merchantSku` (stockCode/barcode) eklenmeli. |
| **CargoCompany1 / 2 / 3** | Listeleme güncellemede var | Body’de sadece `cargoCompanyId: 1` | Formda cargo 1/2/3 seçiliyor; API’de çoklu kargo varsa CargoCompany1, CargoCompany2, CargoCompany3 (veya karşılıkları) eklenmeli. |
| **Video1** | Opsiyonel (MP4) | Yok | İsteğe bağlı: video URL alanı eklenebilir. |
| **Kategori özellikleri** | Zorunlu (attributes) | Kategori seçilince formda yükleniyor, attributeId+value gönderiliyor | Mevcut yapı doğru; sadece tüm zorunlu özelliklerin doldurulduğundan emin olunmalı. |

---

## 5. Listeleme Güncelleme (Ürün Oluştuktan Sonra)

Ürün oluşturulduktan sonra fiyat/stok/kargo güncellemesi **Listeleme Entegrasyonu** ile yapılır. Önemli alanlar:

- Price, AvailableStock, DispatchTime  
- CargoCompany1, CargoCompany2, CargoCompany3  
- ShippingProfileName (teslimat profili)

Doküman: [Listeleme Bilgilerini Güncelleme](https://developers.hepsiburada.com/hepsiburada/reference/listing-bilgilerini-g%C3%BCncelleme-1).  
Projede bu güncelleme akışı ayrı bir endpoint olarak henüz yok; ihtiyaç halinde eklenebilir.

---

## 6. Ürün Durumu Sorgulama

Gönderilen ürünlerin durumu **trackingId** veya **ürün listesi** API’leri ile sorgulanır:

- Ürün durumu sorgulama (trackingId)
- Statü bazlı ürün listesi: `GET .../product/api/products/products-by-merchant-and-status?merchantId=...&productStatus=...`

Statüler: WAITING, MISSING_INFO, MATCHED, PRE_MATCHED, REJECTED, CREATED vb.  
Projede: `GET /api/hepsiburada-api/catalog/list` (productStatus, page, size) kullanılıyor.

---

## 7. Özet Aksiyonlar

1. **description:** `pages/api/hepsiburada/products/create.js` içinde body’e `description: product.description || ""` eklenmeli.
2. **garanteePeriod:** Body’e `guaranteePeriod` (veya API’deki isim) eklenmeli; formdan gelen değer kullanılmalı.
3. **merchantSku:** Listings API’nin beklediği isimle (ör. merchantSku) body’e stockCode/barcode eklenmeli.
4. **CargoCompany1/2/3:** Listings API’de destekleniyorsa formdaki cargoCompany1/2/3 body’e taşınmalı.
5. **Sync (catalog/sync.js):** İleride multi-tenant yapılabilir; kategori özellikleri ve görseller gerçek ürün verisinden doldurulabilir.

---

## 8. Listeleme Entegrasyonu Test Süreci (Resmi Adımlar)

Kaynak: [Listeleme Entegrasyonu Test Süreci Adımları](https://developers.hepsiburada.com/hepsiburada/reference/listeleme-entegrasyonu-test-s%C3%BCreci-ad%C4%B1mlar%C4%B1).

**Listeleme entegrasyonu** şunları kapsar: listing stok, fiyat, kargoya veriliş süresi, kargo firmaları güncelleme; listingleri listeleme, silme, buybox sırası, aktif/pasif yapma, kilit kaldırma. Test sürecini tamamlamak için aşağıdaki adımların uygulanması beklenir.

### 8.1 Zorunlu test adımları (canlıya geçmeden önce)

| Adım | Açıklama | Projede |
|------|----------|--------|
| **Listing Bilgilerini Sorgulama** | Satıcıya ait listing bilgilerini getirir | ❌ Yok |
| **Listing Envanter Güncelleme** | Stok, fiyat, kargolama süresi, teslimat profili günceller (stok/fiyat dışı alanlar için önerilir) | ❌ Yok |
| **Listing Envanter Güncelleme Sorgulama** | Envanter güncelleme isteğinin sonucunu sorgular | ❌ Yok |
| **Listing Stok Güncelleme** | Sadece stok günceller (hızlı, kampanya kısıtından etkilenebilir) | ❌ Yok |
| **Listing Stok Güncelleme Sorgulama** | Stok güncelleme sonucunu sorgular | ❌ Yok |
| **Listing Fiyat Güncelleme** | Sadece fiyat günceller | ❌ Yok |
| **Listing Fiyat Güncelleme Sorgulama** | Fiyat güncelleme sonucunu sorgular | ❌ Yok |
| **Listing Activate** | Stok ve fiyat giriliyse listingi satışa açar | ❌ Yok |
| **Listing Deactivate** | Listingi satışa kapatır | ❌ Yok |
| **Toplu Kilit Kaldırma** | MinLock/MaxLock ile kilitlenen listinglerin toplu kilit kaldırma + satışa açma | ❌ Yok |

### 8.2 Opsiyonel methodlar

| Adım | Açıklama | Projede |
|------|----------|--------|
| Listing Teslimat Güncelleme | Kargolama süresi, teslimat profili | ❌ Yok |
| Listing Teslimat Güncelleme Sorgulama | Teslimat güncelleme sonucu | ❌ Yok |
| Listing Ek Bilgiler Güncelleme | Özelleştirilebilir ürün bilgileri | ❌ Yok |
| Listing Ek Bilgiler Güncelleme Sorgulama | Ek bilgi güncelleme sonucu | ❌ Yok |
| **Listing Tekil Fiyat/Stok Güncelleme** | Tek listing için fiyat + stok + kargolama süresi; yanıt anında döner | ❌ Yok |
| Listing Silme | Listing siler | ❌ Yok |
| Buybox Sıralama Sorgulama | Satış sırası | ❌ Yok |

### 8.3 Projede mevcut olanlar (katalog / listeleme ile ilgili)

| Ne | Nerede | Not |
|----|--------|-----|
| Ürün oluşturma (listings create) | `POST /api/hepsiburada/products/create` → `POST .../product/api/v1/listings` | Yeni ürün listeleme |
| Statü bazlı ürün listesi | `GET /api/hepsiburada-api/catalog/list` → `products-by-merchant-and-status` | WAITING, MATCHED vb. |
| **Tüm katalog (SKU, varyant, marka)** | `GET /api/hepsiburada/catalog/all-products` → `all-products-of-merchant` | Test/canlı baseUrl ile |
| **Marka / model / kapasite** | `GET /api/hepsiburada/catalog/brands?withAttributes=1` | Katalogdan türetilir |
| **Listing listesi (fiyat, stok)** | `GET /api/hepsiburada/listings/list` → listing-external | Test/canlı listing base ile |
| Test bağlantısı | `listings/merchantid/{id}/products` (test-connection) | Bağlantı kontrolü |

**Özet:** Listeleme **güncelleme** (stok, fiyat, envanter, activate/deactivate, kilit kaldırma) ve **listing bilgilerini sorgulama** projede henüz yok. Test sürecini tamamlamak ve canlıya geçmek için bu endpoint’lerin eklenmesi gerekir. Canlı ortam bilgisi için: Merchant Panel → Yardım Merkezi → Talepler → API Entegrasyon Teknik Destek üzerinden ticket açılması önerilir.

---

## 9. Canlıya geçiş (test bittikten sonra)

### 9.1 Test ortamı – Basic Authentication

Hepsiburada API (katalog, listing, sipariş) **Basic Auth** kullanır. Username = Merchant ID, Password = Secret key.

| Alan | Değer |
|------|--------|
| **Username (Merchant ID)** | `07283889-aa00-4809-9d19-b76d97f9bebd` |
| **Password (Secret key)** | `ttFE8CrzpC8a` |
| **User-Agent (Developer)** | `tigdes_dev` |

**Önemli:** Merchant ID’de **4809** yazılmalı (4800 değil). Yanlış yazarsanız Listing API "Merchant api authorization failed" (401) döner.

**.env örneği (test):**
```env
HEPSIBURADA_MERCHANT_ID=07283889-aa00-4809-9d19-b76d97f9bebd
HEPSIBURADA_AUTH=MDcyODM4ODktYWEwMC00ODA5LTlkMTktYjc2ZDk3ZjliZWJkOnR0RkU4Q3J6cEM4YQ==
HEPSIBURADA_USER_AGENT=tigdes_dev
HEPSIBURADA_BASE_URL=https://mpop-sit.hepsiburada.com
```
`HEPSIBURADA_AUTH` = Base64(`MerchantId:Secretkey`). Yukarıdaki değer `07283889-aa00-4809-9d19-b76d97f9bebd:ttFE8CrzpC8a` için geçerlidir. Alternatif: `HB_MERCHANT_ID` + `HB_SECRET_KEY` (veya `HB_PASSWORD`) tanımlayın; kod Basic token’ı kendisi oluşturur.

### 9.2 Ortam URL’leri

| Ortam | Katalog / Ürün (mpop) | Listeleme (listing) |
|-------|------------------------|----------------------|
| **Test (SIT)** | `https://mpop-sit.hepsiburada.com` | `https://listing-external-sit.hepsiburada.com` |
| **Canlı** | `https://mpop.hepsiburada.com` | `https://listing-external.hepsiburada.com` |

### 9.3 Yapılacaklar

1. **API Ayarları (panel)**  
   Şirket ayarlarında Hepsiburada için **test modunu kapat** (testMode: false) veya canlı merchant ID / kullanıcı adı / şifre gir. `getHBSettings` canlıda `baseUrl = https://mpop.hepsiburada.com` döner.

2. **Ortam değişkenleri (.env)**  
   - Canlı merchant ve şifre: `HEPSIBURADA_MERCHANT_ID`, `HEPSIBURADA_AUTH` (veya `HB_MERCHANT_ID`, `HB_SECRET_KEY` / `HB_PASSWORD`).  
   - Canlı katalog base: `HEPSIBURADA_BASE_URL=https://mpop.hepsiburada.com`  
   - Canlı listing base (isteğe bağlı): `HEPSIBURADA_LISTING_BASE_URL=https://listing-external.hepsiburada.com`  
   - Test modu kapalı: `HB_TEST_MODE=false` (veya tanımlama).

3. **Kod tarafı**  
   Tüm HB çağrıları artık env veya `getHBSettings` üzerinden base URL alıyor; test/canlı ayrımı otomatik.

4. **Hepsiburada’dan canlı bilgiler**  
   Test sürecini tamamladıktan sonra canlı ortam bilgileri için: **Merchant Panel → Yardım Merkezi → Talepler → API Entegrasyon Teknik Destek** üzerinden ticket açın.

### 9.4 Kısa kontrol listesi

- [ ] Test ortamında ürün gönderimi, katalog çekme, marka/model/kapasite, listing listesi denenmiş
- [ ] API Ayarlarında canlı merchant ID ve şifre girilmiş (veya .env)
- [ ] `HEPSIBURADA_BASE_URL` canlı için `https://mpop.hepsiburada.com` yapılmış
- [ ] Test modu kapatılmış (panel veya HB_TEST_MODE=false)
- [ ] Listeleme test adımları (doküman §8) tamamlanmışsa canlı ticket açılmış

---

## Referanslar

- [Katalog Önemli Bilgiler](https://developers.hepsiburada.com/hepsiburada/reference)  
- [Hızlı Ürün Yükleme](https://developers.hepsiburada.com/hepsiburada/reference/uploadfastlistingproduct)  
- [Listeleme Bilgilerini Güncelleme](https://developers.hepsiburada.com/hepsiburada/reference/listing-bilgilerini-g%C3%BCncelleme-1)  
- [Listeleme Entegrasyonu Test Süreci Adımları](https://developers.hepsiburada.com/hepsiburada/reference/listeleme-entegrasyonu-test-s%C3%BCreci-ad%C4%B1mlar%C4%B1)
