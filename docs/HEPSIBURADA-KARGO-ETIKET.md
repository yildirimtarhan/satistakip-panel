# Hepsiburada Kargo Teslim Etiketi Şablonu

## Ne var?

- **Yazdırılabilir kargo etiketi** (alıcı, adres, sipariş no, takip no, kargo firması) — panelden "Etiket" linki veya doğrudan API ile açılır, yazdırılır.
- **API:** `GET /api/hepsiburada/orders/kargo-etiket?orderNumber=SIPARIS_NO` → HTML döner (yeni sekmede açıp yazdır).

## Panelde kullanım

**Hepsiburada → Siparişler** tablosunda her sipariş için **Etiket** sütunundaki linke tıklayın. Açılan sayfada **Yazdır** ile etiket çıktısı alınır.

## Şablon alanları

| Alan | Nereden gelir |
|------|----------------|
| Sipariş no / Paket no | `hb_orders` → data.orderNumber, packageNumber |
| Takip no | data.shipmentTrackingNumber, trackingInfoCode |
| Kargo firması | data.cargoCompany |
| Alıcı / Adres / İlçe / İl / Telefon | data.shippingAddress (recipientName, address, district, city, phone) |
| Gönderen | .env `HEPSIBURADA_SENDER_NAME` (opsiyonel) |

## Hepsiburada developer — resmi barkod

Etiket üzerinde **resmi barkod** (ZPL/PDF) kullanmak için Hepsiburada API:

- **Paket kargo bilgisi:** `GET https://oms-external-sit.hepsiburada.com/packages/merchantid/{merchantId}/packagenumber/{packagenumber}`  
  → barcode, trackingInfoCode, trackingInfoUrl, cargoCompany vb.
- **Ortak barkod oluşturma:** `GET .../packages/merchantid/{merchantId}/packagenumber/{packagenumber}/labels?format=...`  
  → Yanıtta `data` (barkod verisi dizisi), `format` döner. Bu veri ZPL/PDF dönüşümü için kullanılabilir.

Test: `oms-external-sit.hepsiburada.com`; canlı: `oms-external.hepsiburada.com` (veya Hepsiburada’nın verdiği canlı OMS URL’i). Basic Auth + User-Agent gerekir.

## Şablon dosyası

- `lib/hepsiburadaKargoEtiketSablonu.js` — `getKargoEtiketHtml(data)` ile HTML üretilir.
- `pages/api/hepsiburada/orders/kargo-etiket.js` — Siparişi `hb_orders`’dan okur, şablonu doldurur, HTML döner.

İsterseniz Hepsiburada’dan gelen örnek etiket (PDF/ZPL) veya ek alanları paylaşırsanız şablona ekleyebiliriz.
