# Pazaryerleri İçin Varyant Yapısı

ERP’deki **varyantlar** (renk, beden, barkod, SKU, stok, fiyat) pazaryerlerine nasıl yansıtılıyor?

---

## 1. Genel mantık

| Pazaryeri     | Varyant modeli | Bizim yaptığımız |
|---------------|-----------------|-------------------|
| **Trendyol**  | Parent ürün + varyant listesi (attributeId: Renk, Beden) | `product.variants` → API `variants[]` (barcode, sku, quantity, salePrice, attributes) |
| **N11**       | Tek ürün = birden fazla SKU (her SKU ayrı stok/fiyat) | Varyant varsa `skus[]` dizisine her varyant = 1 SKU (başlık + renk/beden, stockCode, barcode, quantity, salePrice) |
| **Hepsiburada** | VaryantGroupID + kategori özellikleri (Renk, Beden) veya her varyant ayrı listing | Varyant varsa her varyant için ayrı listing (merchantSku, barcode, stok, fiyat) |

---

## 2. Trendyol

- **Kod:** `lib/marketplaces/trendyolService.js`
- **Yapı:** Parent ürün tek; `variants` dizisinde her varyantın `barcode`, `sku`, `quantity`, `salePrice`, `listPrice` ve `attributes` (Renk/Beden) gönderiliyor.
- **Önemli:** `attributeId` değerleri (338 = Renk, 339 = Beden) **kategoriye göre değişir**. Doğru ID’ler için Trendyol kategori özellikleri API’sinden alınmalı; şu an örnek sabit kullanılıyor. Kategoriye özel eşleme eklenebilir.

---

## 3. N11

- **Kod:** `lib/marketplaces/n11Service.js`
- **Yapı:** N11 “product create” tek task’ta **birden fazla SKU** kabul eder. ERP’de varyant varsa:
  - Her varyant için bir SKU: `stockCode` = varyant SKU (veya ana SKU + sonek), `barcode` = varyant barkodu, `quantity` = stok, `salePrice` = fiyat.
  - Başlık: Ana ürün adı + “Renk / Beden” bilgisi (örn. “Tişört - Siyah / M”).
- Varyant yoksa tek SKU ile mevcut akış aynen çalışır.

---

## 4. Hepsiburada

- **Kod:** `pages/api/hepsiburada/products/create.js`
- **Resmi:** Dokümanda `VaryantGroupID` ve kategori özellikleri (Renk, Beden vb.) geçer. Listings API’de varyant gruplu tek ürün mü yoksa her varyant ayrı listing mi beklendiği platform dokümanına bakılmalı.
- **Bizim uygulama:** Varyant varsa **her varyant için ayrı listing** gönderiyoruz (her birinde kendi merchantSku, barcode, stok, fiyat). Böylece HB tarafında her kombinasyon ayrı listelenir; gerekirse ileride VaryantGroupID ile gruplama eklenebilir.

---

## 5. ERP tarafı (Yeni Ürün / Düzenle)

- **Yeni Ürün** sayfasında “Varyantlar” sekmesi: Renk, Beden, Barkod, SKU, Stok, Fiyat (TL), isteğe bağlı görsel URL’leri.
- **Kayıt:** `variants` dizisi API’ye gidiyor; stok toplamı (varyantlı ürünlerde) otomatik hesaplanıyor.
- Pazaryerine gönderirken bu `variants` alanı yukarıdaki kurallara göre N11/Trendyol/HB formatına dönüştürülüyor.

Bu yapı ile pazaryerleri için varyant olayı tek yerden (ERP varyantları) yönetilip platformlara uyumlu şekilde gönderiliyor.
