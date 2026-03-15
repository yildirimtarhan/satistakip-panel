# İdefix Ürün Entegrasyonu

Dokümantasyon: https://developer.idefix.com/api/urun-entegrasyonu

---

## 1. Hızlı Ürün Yükleme

- **Ne için:** İdefix katalogunda zaten bulunan, global barkodlu ürünler. Mapping gerekmez.
- **Akış:** Method ile hızlı yükleme → sistem eşleşme kontrolü → eşleşme varsa **ürün onay/red** ile işleme alınır.
- **Not:** Katalogda olmayan ürünler için “Yeni Ürün Yükleme” (ürün create) kullanılmalı.

**Projede:** `idefixFastListing(creds, items)` ✅ | API: `POST /api/idefix/products/fast-listing` ✅ (body: `{ items: [{ barcode, title, vendorStockCode, price, comparePrice?, inventoryQuantity }] }`). Yanıttaki `batchRequestId` ile toplu durum sorgulanır; eşleşenler onay/red (approve-item / decline-item) ile işlenir.

---

## 2. Yeni Ürün Yükleme

- **Önce:** Marka, **kategori** (product-category servisi), kategori özellik bilgileri ilgili servislerden alınmalı.
- **Sonra:** Ürün oluşturma methodu ile ürün bilgileri gönderilir.
- **Sonuç:** Onay süreci → eşleşme varsa **ürün onay/red**; eşleşme yoksa ve operatör onaylarsa stok/fiyat gönderilerek satışa açılır.
- **Durum sorgulama:** **batch-result** servisi (batchRequestId ile).

**Projede:** `idefixCreateProducts(creds, products)` ✅ | API: `POST /api/idefix/products/create` ✅ | Durum: `idefixGetBatchResult` + API route.

---

## 3. Eşleşmelerin Onay ve Reddedilmesi

- **matchedProduct:** Ürün durumu sorgulandığında eşleşen katalog ürünü bu alanda döner.
- **Onay:** Satıcı onaylama methodu → 24 saat içindeyse ilk gönderilen satış bilgileri ile ürün açılır; 24 saat geçtiyse envantere stok/fiyat gönderimi beklenir.
- **Red:** Eşleşme reddetme methodu ile eşleşme reddedilir.

**Projede:** Onay/red endpoint’leri dokümandaki path’lere göre eklenebilir (approve-item / decline-item vb.).

---

## 4. Stok ve Fiyatların Gönderilmesi

- **Method:** **inventory-upload** (stok ve fiyat güncelleme).
- **Durum sorgulama:** **inventory-result** (batchRequestId ile). Status: `created` | `decline` | `completed`.

**Projede:**
- `idefixInventoryUpload(creds, items)` → POST `pim/catalog/{vendorId}/inventory-upload` ✅
- `idefixGetInventoryResult(creds, batchId)` → GET `pim/catalog/{vendorId}/inventory-result/{batchId}` ✅

---

## Stok ve Fiyat Gönderimi (inventory-upload)

- **POST** `pim/catalog/{vendorId}/inventory-upload` — Kataloga eklenmiş onaylı ürünlere stok ve fiyat gönderir. Durum **inventory-result** ile batchRequestId üzerinden sorgulanır.
- İstek: `{ items: [ { barcode*, price?, comparePrice?, inventoryQuantity?, maximumPurchasableQuantity?, deliveryDuration?, deliveryType?, isZoneSale? } ] }`. Zorunlu: **barcode**. comparePrice göndermek istemiyorsanız 0 gönderin. deliveryType: `regular` | `same_day_shipping`.
- Yanıt: `items` (her biri status içerir), `lastUpdatedAt`, `completedAt`, `createdAt`, `status`, **batchRequestId**.

**Projede:** `idefixInventoryUpload(creds, items)` ✅ | API: `POST /api/idefix/products/inventory-upload` ✅

---

## Toplu Stok ve Fiyat Durum Sorgulama (inventory-result)

- **GET** `pim/catalog/{vendorId}/inventory-result/{batchId}` — Stok ve fiyat gönderiminden dönen **batchRequestId** ile toplu işlem durumu sorgulanır.
- Yanıt: `items` (barcode, price, comparePrice, inventoryQuantity, deliveryDuration, deliveryType, **status**, statusDateCreatedAt, **failureReasons**), `lastUpdatedAt`, `completedAt`, `createdAt`, `status`, `batchRequestId`.
- **status (ürün):** `created` = talep oluşturuldu, `decline` = hata, `completed` = işlem başarılı.
- **failureReasons** (yalnızca status = decline): DATA_PARSE_ERROR, BATCH_NOT_EXIST, BATCH_ALREADY_PROCESSED, PRODUCT_NOT_FOUND, CATALOG_PRICE_LOCKED (fiyat kilitli, destek ile görüşülmeli).

**Projede:** `idefixGetInventoryResult(creds, batchId)` ✅ | API: `GET /api/idefix/products/inventory-result/[batchId]` ✅

---

## Stok ve Fiyat Güncel Durum Listesi (inventory-list)

- **GET** `pim/catalog/{vendorId}/inventory/list` — Ürünlerin güncel stok ve fiyat bilgilerini döner.
- Yanıt: `{ items: [ { barcode, stockCode, price, comparePrice, inventoryQuantity } ] }`.

**Projede:** `idefixGetInventoryList(creds)` ✅ (vendorId creds'tan) | API: `GET /api/idefix/products/inventory/list` ✅

---

## Ürün Oluşturma (create)

- **POST** `pim/pool/{vendorId}/create` — Ürünler İdefix MP'ye bu method ile yüklenir. Önce **Marka Listesi**, **Kategori Listesi** ve **Kategori Özellik Listesi** (category-attribute) alınmalı; **required = true** olan attribute'lar mutlaka gönderilmelidir. Ürün güncelleme API ile yapılmamaktadır.
- İstek: `{ products: [ {...} ] }`. **Zorunlu:** barcode, title, productMainId, brandId, categoryId, inventoryQuantity, vendorStockCode, description, price, vatRate, images[].url (https, max 8/barkod), attributes (attributeId, attributeValueId veya customAttributeValue; category-attribute'daki required alanlar). **Opsiyonel:** comparePrice, desi, weight, deliveryDuration, deliveryType, cargoCompanyId, shipmentAddressId, returnAddressId, originCountryId, manufacturer, importer, ceCompatibility, usageInstructionsImage, packageFrontImage, packageBackImage, productInfoFormImage, energyClassImage, energyNutritionImage, lotInfo, erpId, authorId.
- Varyantlı ürün: Aynı **productMainId** ile birden fazla ürün (farklı barcode/vendorStockCode/attributes) gönderilir.
- Yanıt: **batchRequestId** — durum **batch-result** servisi ile sorgulanır.

**Projede:** `idefixCreateProducts(creds, products)` ✅ | API: `POST /api/idefix/products/create` ✅

---

## Toplu Ürün Durumu Sorgulama (batch-result)

- **GET** `pim/pool/{vendorId}/batch-result/{batchId}` — Ürün create yanıtındaki **batchRequestId** ile ürünlerin ve toplu işlemin durumu sorgulanır.
- Yanıt: `products[]` (status, statusDateCreatedAt, reference, **failureReasons**, **matchedProduct**, needAutoMatch, addType, …), `lastUpdatedAt`, `completedAt`, `createdAt`, `status` (batch), `batchRequestId`.
- **Ürün statüleri:** waiting_catalog_action, waiting_vendor_approve (approve-item / decline-item kullanılabilir), ready_for_sale, vendor_declined, missing_info, platform_declined, not_matched (list servisinden takip), auto_matched, manual_matched.
- **Batch statüleri:** created, completed, running, failed, cancelled.
- **failureReasons** (ör.): CATEGORY_MANDATORY_ATTRIBUTE_MISSED, ATTRIBUTE_MULTIPLE_NOT_ALLOWED, CUSTOM_ATTRIBUTE_NOT_SUPPORTED_YET, ATTRIBUTEVALUE_NOT_DEFINED, BRAND_NOT_EXIST, VENDOR_RETURN_ADDRESS_NOT_CORRECT, VENDOR_SHIPMENT_ADDRESS_NOT_CORRECT, PRODUCT_IMAGE_MANDATORY_ONCREATE, VENDOR_CATEGORY_ACCESS_DENIED, BRAND_EXCLUSIVE_NOT_AUTHORIZED, VENDOR_BRAND_ACCESS_DENIED, VENDOR_ACCESS_DENIED, DATA_PARSE_ERROR, NO_BATCH_ID_EXIST, PRODUCT_POOL_ALREADY_EXIST, VENDOR_IN_VACATION_MODE, BRAND_FAILED_TO_MATCH, CATEGORY_FAILED_TO_MATCH.

**Projede:** `idefixGetBatchResult(creds, batchId)` ✅ | API: `GET /api/idefix/products/batch-result/[batchId]` ✅

---

## Ürün Merchant Onayı (approve-item)

- **POST** `pim/pool/{vendorId}/approve-item` — Create sonrası katalogda eşleşen ve **waiting_vendor_approve** statüsüne düşen ürünleri onaylar. Aynı işlem merchant center backoffice üzerinden de yapılabilir.
- İstek: `{ items: [ { barcode: "string" } ] }` — Onaylanacak ürünlerin barkodları.
- not_matched statüsündekiler için idefix ekibinin aksiyonu beklenir; güncel durum batch-result ile batchId üzerinden sorgulanır.

**Projede:** `idefixApproveItem(creds, items)` ✅ | API: `POST /api/idefix/products/approve-item` ✅

---

## Ürün Merchant Red (decline-item)

- **POST** `pim/pool/{vendorId}/decline-item` — Create sonrası katalogda eşleşen ve **waiting_vendor_approve** statüsünde olan ürünlerde, eşleşen ürün aynı değilse birleştirmeyi reddetmek için kullanılır.
- İstek: `{ items: [ { barcode: "string" } ] }` — Reddedilecek ürünlerin barkodları.
- not_matched statüsündekiler için idefix ekibinin aksiyonu beklenir; güncel durum batch-result ile batchId üzerinden sorgulanır.

**Projede:** `idefixDeclineItem(creds, items)` ✅ | API: `POST /api/idefix/products/decline-item` ✅

---

## Kategori Listesi (product-category)

- **GET** `pim/product-category` — Ürün create isteklerinde kullanılacak kategori ID’leri buradan alınır.
- Response: `id`, `parentId`, `subs` (alt kategoriler), `name`, `topCategory`.

**Projede:** `idefixGetProductCategories(creds)` ✅ | API: `GET /api/idefix/categories/product-category` ✅

---

## Kategori Özellik Listesi (category-attribute)

- **GET** `pim/category-attribute/{categoryID}` — Ürün create'te gönderilecek attributes ve detayları. **En alt seviye** kategori ID kullanılmalı (alt kategorisi olan kategoride ürün oluşturulamaz).
- Response: `id`, `name`, `categoryAttributes[]` → `attributeId`, `attributeTitle`, `allowCustom`, `required`, `isVariant`, `isSlicer`, `attributeValues[]` (id, name).
- **required = true** olan özellikler create isteğinde mutlaka gönderilmelidir.

**Projede:** `idefixGetCategoryAttributes(creds, categoryId)` ✅ | API: `GET /api/idefix/categories/category-attribute/[categoryId]` ✅

---

## Ülke Listesi (origin-country)

- **GET** `pim/country/origin-country` — Ürün create'te denetim bilgileri (originCountryId) gönderilecekse ülke ID'leri buradan alınır.
- Parametre: `name` (opsiyonel) — Cevapta yer alacak ülke adı filtresi.
- Response: Dizi — `id`, `name`.

**Projede:** `idefixGetOriginCountries(creds, { name? })` ✅ | API: `GET /api/idefix/country/origin-country?name=` ✅

---

## Marka Listesi (brand)

- **GET** `pim/brand` — Ürün create'te gönderilecek marka bilgisi buradan alınır.
- Parametreler: `page`, `size` (sayfalama).
- Response: Dizi — `id`, `title`, `slug`, `description`, `metaKeyword`, `metaTitle`, `metaDescription`, `exclusiveBrand`, `logo`, `bookPublisher` (false = marka, true = yayınevi).

**Projede:** `idefixGetBrands(creds, { page?, size? })` ✅ | API: `GET /api/idefix/brand?page=&size=` ✅

---

## Marka Listesi Filtreleme (brand/by-name)

- **GET** `pim/brand/by-name?title={markaIsmi}` — Marka bilgisini isimle filtreleyip tek marka döner. Create isteğinde isimle arama için.
- Parametre: `title` — Aranacak marka ismi.
- Response: Tek obje — `id`, `title`, `slug`, `description`, `metaKeyword`, `metaTitle`, `metaDescription`, `exclusiveBrand`, `logo`, `bookPublisher` (false = marka).

**Projede:** `idefixGetBrandByName(creds, title)` ✅ | API: `GET /api/idefix/brand/by-name?title=` ✅

---

## Marka ID Arama (brand/{markaId})

- **GET** `pim/brand/{markaId}` — Marka bilgisini ID ile sorgulayıp tek marka döner. Create isteğinde markayı ID ile aramak için.
- Parametre: `brandId` (path) — Aranacak marka ID.
- Response: Tek obje — `id`, `title`, `slug`, `description`, `metaKeyword`, `metaTitle`, `metaDescription`, `exclusiveBrand`, `logo`, `bookPublisher` (false = marka).

**Projede:** `idefixGetBrandById(creds, brandId)` ✅ | API: `GET /api/idefix/brand/[brandId]` ✅

---

## Marka İsim Arama (brand/search-by-name)

- **GET** `pim/brand/search-by-name?title={markaIsmi}` — Marka bilgisini isimle arayıp tek marka döner. Create isteğinde isimle arama için.
- Parametre: `title` — Aranacak marka ismi.
- Response: Tek obje — `id`, `title`, `slug`, `description`, `metaKeyword`, `metaTitle`, `metaDescription`, `exclusiveBrand`, `logo`, `bookPublisher` (false = marka).

**Projede:** `idefixGetBrandSearchByName(creds, title)` ✅ | API: `GET /api/idefix/brand/search-by-name?title=` ✅

---

## Sevkiyat ve İade Adres Listesi (address)

- **GET** `pim/vendor/{vendorId}/address` — Sistemde tanımlı sevkiyat, iade ve fatura adresleri. Create isteğinde kullanılacak adres ID'leri buradan alınır.
- Response: Dizi — `id`, `addressType` (return | invoice | shipping), `cityText`, `neighborhoodText`, `postalCode`, `fullAddress`, `isDefault`, `cityId`, `districtId`, `countyId`, `neighborhoodId`.

**Projede:** `idefixGetVendorAddresses(creds)` ✅ (vendorId creds'tan) | API: `GET /api/idefix/address` ✅

---

## Kargo Şirketleri Listesi (cargo-company)

- **GET** `pim/cargo-company` — Create isteğinde gönderilecek kargo firma ID'leri buradan alınır.
- Response: Dizi — `id`, `title`, `code`, `taxNumber`.

**Projede:** `idefixGetCargoCompanies(creds)` ✅ | API: `GET /api/idefix/cargo-company` ✅

---

## Platform Kargo Profil Listesi (cargo-company/profile/list)

- **GET** `pim/cargo-company/profile/list` — Platformda tanımlı kargo profil bilgileri ve ID'leri.
- Response: Dizi — `title`, `cargoCompany` (id, title, code, taxNumber), `status`, `cargoIntegrationUrl`, `cargoTrackingUrl`, `cargoUserCredential`, `isPlatformTrackingSupport`, `isSellerTrackingSupport`, `isPlatformAgreementSupport`, `isSellerAgreementSupport`, `isPlatformCargoSend`, `isSellerCargoSend`, `acceptReturn`, `fullCoverage`, `acceptHomeReturn`.

**Projede:** `idefixGetCargoProfileList(creds)` ✅ | API: `GET /api/idefix/cargo-company/profile/list` ✅

---

## Satıcı Kargo Profil Listesi (cargo-company/{vendorId}/profile/list)

- **GET** `pim/cargo-company/{vendorId}/profile/list` — Satıcıya tanımlı kargo profil bilgileri ve ID'leri (vendorId ayarlardan).
- Response: Dizi — `id`, `vendorId`, `title`, `cargoCompany`, `status`, `isPlatformIntegrated`, `cargoIntegrationUrl`, `cargoTrackingUrl`, `cargoUserCredential`, `isPlatformTrackingSupport`, `isPlatformAgreementSupport`, `isSellerAgreementSupport`, `isPlatformCargoSend`, `isSellerCargoSend`, `acceptReturn`, `fullCoverage`, `acceptHomeReturn`, `startAt`.

**Projede:** `idefixGetVendorCargoProfileList(creds)` ✅ (vendorId creds'tan) | API: `GET /api/idefix/vendor/cargo-profile/list` ✅

---

## Ürünlerim Listesi (pool/{vendorId}/list)

- **GET** `pim/pool/{vendorId}/list` — Marketplace'e gönderilen tüm ürünler. **Pagination zorunlu:** `page`, `limit`. Opsiyonel: `barcode`, `state`.
- Response: `{ products: [...] }` — barcode, title, productMainId, brandId, categoryId, inventoryQuantity, vendorStockCode, weight, description, price, comparePrice, vatRate, deliveryDuration, deliveryType, cargoCompanyId, shipmentAddressId, returnAddressId, images, attributes, status, statusDateCreatedAt, reference, failureReasons, matchedProduct, needAutoMatch, addType, erpId, authorId.

**Projede:** `idefixGetProductList(creds, { page, limit, barcode?, state? })` ✅ | API: `GET /api/idefix/products/list?page=&limit=&barcode=&state=` ✅

---

## Hızlı Ürün Ekleme (fast-listing)

- **POST** `pim/catalog/{vendorId}/fast-listing` — Katalogda kayıtlı ve global barkodlu ürünleri mapping olmadan satışa açar. Katalogda yoksa yüklenmez; ilk defa açılacak ürünler için "Ürün Oluşturma" kullanılmalı.
- İstek: `{ items: [ { barcode*, title*, vendorStockCode*, price*, comparePrice?, inventoryQuantity* } ] }`.
- Yanıt: `items`, `lastUpdatedAt`, `completedAt`, `createdAt`, `status`, **batchRequestId** (toplu hızlı ürün durumu sorgulama + onay/red için).
- Bilgi: Eksiksiz bilgi gönderilmeli; batchRequestId ile eşleşen/başarısız ürünler kontrol edilir; onay/red panel veya approve-item / decline-item API ile yapılır.

**Projede:** `idefixFastListing(creds, items)` ✅ | API: `POST /api/idefix/products/fast-listing` ✅

---

## Hızlı Ürün Ekleme Durum Sorgulama (fast-listing-result)

- **POST** `pim/catalog/{vendorId}/fast-listing-result/{batchID}` — fast-listing yanıtındaki **batchRequestId** ile ürünlerin durumunu sorgular.
- Yanıt: `items` (poolState, matchedProduct, status, statusDateCreatedAt; DECLINE ise hata kodu), `lastUpdatedAt`, `completedAt`, `createdAt`, `status` (COMPLETED | DECLINE), `batchRequestId`.
- **Status:** COMPLETED = barkod bulundu ve satıcıya eklendi; DECLINE = sorun nedeniyle yüklenemedi.
- **DECLINE hata kodları:** PRODUCT_POOL_ALREADY_EXIST, PRODUCT_BARCODE_NOT_EXIST, VENDOR_CATEGORY_ACCESS_DENIED, VENDOR_ACCESS_DENIED, BRAND_EXCLUSIVE_NOT_AUTHORIZED.

**Projede:** `idefixGetFastListingResult(creds, batchId)` ✅ | API: `POST /api/idefix/products/fast-listing-result/[batchId]` ✅

---

## Özet Tablo

| Akış | İdefix method | Proje durumu |
|------|----------------|--------------|
| Kategori listesi | GET product-category | ✅ idefixGetProductCategories + API route |
| Kategori özellik listesi | GET category-attribute/{categoryID} | ✅ idefixGetCategoryAttributes + API route |
| Ülke listesi (originCountryId) | GET country/origin-country?name= | ✅ idefixGetOriginCountries + API route |
| Marka listesi | GET brand (page, size) | ✅ idefixGetBrands + API route |
| Marka filtreleme (isimle) | GET brand/by-name?title= | ✅ idefixGetBrandByName + API route |
| Marka ID arama | GET brand/{markaId} | ✅ idefixGetBrandById + API route |
| Marka isim arama | GET brand/search-by-name?title= | ✅ idefixGetBrandSearchByName + API route |
| Sevkiyat/iade adres listesi | GET vendor/{vendorId}/address | ✅ idefixGetVendorAddresses + API route |
| Kargo şirketleri listesi | GET cargo-company | ✅ idefixGetCargoCompanies + API route |
| Platform kargo profil listesi | GET cargo-company/profile/list | ✅ idefixGetCargoProfileList + API route |
| Satıcı kargo profil listesi | GET cargo-company/{vendorId}/profile/list | ✅ idefixGetVendorCargoProfileList + API route |
| Ürünlerim listesi | GET pool/{vendorId}/list (page, limit zorunlu) | ✅ idefixGetProductList + API route |
| Hızlı ürün ekleme | POST catalog/{vendorId}/fast-listing | ✅ idefixFastListing + API route |
| Hızlı ürün durum sorgulama | POST catalog/{vendorId}/fast-listing-result/{batchID} | ✅ idefixGetFastListingResult + API route |
| Ürün oluşturma (create) | POST pool/{vendorId}/create | ✅ idefixCreateProducts + API route |
| Ürün merchant onayı | POST pool/{vendorId}/approve-item | ✅ idefixApproveItem + API route |
| Ürün merchant red | POST pool/{vendorId}/decline-item | ✅ idefixDeclineItem + API route |
| Stok/fiyat gönderimi | POST catalog/{vendorId}/inventory-upload | ✅ idefixInventoryUpload + API route |
| Stok/fiyat durum | GET catalog/{vendorId}/inventory-result/{batchId} | ✅ idefixGetInventoryResult + API route |
| Stok/fiyat güncel listesi | GET catalog/{vendorId}/inventory/list | ✅ idefixGetInventoryList + API route |
| Ürün toplu durum | GET pool/{vendorId}/batch-result/{batchId} | ✅ idefixGetBatchResult + API route |
