# İdefix Sipariş Entegrasyonu

Bu doküman sipariş/sevkiyat akışı ve fatura bildirimi özetini içerir. Detaylı path ve parametreler için İdefix geliştirici dokümantasyonuna bakınız.

---

## 1. Sevkiyat Listesi (list) – Siparişlerin Alınması

- **GET** `oms/{vendorId}/list` — Ödeme kontrolünden geçmiş, satıcıya ait **shipment**'lar bu method ile alınır. Dokümanlarda siparişler **shipment** olarak adlandırılır.
- **orderNumber:** İlgili shipment'ın İdefix sistemindeki **ana sipariş numarası**. **id:** Bu sipariş numarasına bağlı **sevkiyat** (shipment) ID’si.

### Parametreler

| Parametre | Açıklama |
|-----------|----------|
| vendor * | Satıcı ID (zorunlu). Projede creds'tan alınır. |
| ids | Shipment numarası bazında sorgulama. Birden fazla değer virgül ile gönderilebilir. |
| orderNumber | Ana sipariş numarası. |
| state | Shipment statüsü (aşağıdaki tabloya göre). |
| startDate | Bu tarihten sonraki shipment'lar. Format: `2022/09/30 23:59:59` |
| endDate | Bu tarihe kadar olan shipment'lar. Format: `2022/09/30 23:59:59` |
| lastUpdatedAt | Son güncellenme tarihine göre. Format: `2022/09/30 23:59:59` |
| page | Sayfa (varsayılan: 1). |
| limit | Sayfa başına kayıt (varsayılan: 10). |
| sortByField | id, createAt, updateAt. |
| sortDirection | desc, asc. |

### Kurumsal / Bireysel Fatura

- **isCommercial:** Kurumsal fatura gerekiyorsa `"1"`, bireysel `" "` (boş). Kurumsal (`isCommercial = "1"`) durumda **company**, **taxNumber**, **taxOffice** bilgisi **invoiceAddress** içinden alınır.
- **isLikeCommercial:** Bireysel müşterinin kurumsal fatura talep ettiği durumda döner; isCommercial ile aynı mantıkta kullanılır.
- Bireysel faturada platform indirim ve kuponları ilgili parametrelerde 0 döner.

### Response (özet)

- **Header:** totalCount, itemCount, pageCount, currentPage, limit.
- **items[]:** Her biri: id, orderNumber, totalPrice, totalDiscount, discountedTotalPrice, totalPlatformDiscount, totalVendorDiscount, invoiceAddress (isCommercial, company, taxNumber, taxOffice, …), shippingAddress, customerContactName, customerContactMail, cargoTrackingNumber, cargoTrackingUrl, cargoCompany, status, statusUpdatedAt, histories, deliveryType, estimatedDeliveryDate, **items[]** (ürünler: productName, barcode, price, platformDiscount, vendorDiscount, commissionAmount, earningAmount, itemStatus, …).

### Shipment Statüleri

| Değer | Açıklama |
|-------|----------|
| created | Shipment oluşturuldu, henüz toplanmaya hazır değil. |
| shipment_ready | Hazırlanmaya başlanabilir. |
| shipment_picking | Toplama/paket hazırlığı başladı; **iptal edilemez**. Bu statü **update-shipment-status** servisi ile bildirilmelidir. |
| shipment_invoiced | Fatura kesildi. **update-shipment-status** servisi ile bildirilmelidir. |
| shipment_cancelled | Müşteri iptal etti. |
| shipment_unsupplied | Temin edilemedi olarak bildirildi (noship servisi). |
| shipment_split | Parçalı işlem yapıldı. |
| shipment_in_cargo | Kargoya verildi. |
| shipment_delivered | Müşteriye teslim edildi. |
| shipment_undeliver | Teslim edilemedi. |
| shipment_approved | Süreç tamamlandı, satıcı hak ediş hesaplama sürecine geçti. |

**Projede:** `idefixGetShipmentList(creds, params)` ✅ | API: `GET /api/idefix/orders/list` ✅  
Tüm list parametreleri desteklenir: ids, orderNumber, state, startDate, endDate, lastUpdatedAt, page, limit, sortByField, sortDirection.

---

## 2. Shipment Statü Güncelleme (update-shipment-status)

- **POST** `oms/{vendorId}/{shipmentId}/update-shipment-status` — Shipment statüsünü **hazırlanıyor** (picking) veya **faturalandı** (invoiced) olarak bildirmek için kullanılır.
- **picking:** Shipment depoda hazırlanma durumuna geçtiğinde ve müşteri tarafından iptale izin verilmeyecekse bu statüye güncellenir. Body: `{ status: "picking", invoiceNumber?: "string" }`.
- **invoiced:** Shipment hazırlanıp faturalandığında ve fatura numarası oluşturulduğunda. Body: `{ status: "invoiced", invoiceNumber: "11111112" }`. **invoiceNumber** zorunludur.
- **shipmentId:** Statüsü güncellenecek sevkiyat ID (list cevabındaki `items[].id`).

**Projede:** `idefixUpdateShipmentStatus(creds, shipmentId, { status, invoiceNumber? })` ✅ | API: `POST /api/idefix/orders/update-shipment-status` ✅ (body: shipmentId, status, invoiceNumber)

---

## 3. Sipariş Bölme (split-package)

- **POST** `oms/{vendorId}/{shipmentId}/split-package` — Bir shipment’ı birden fazla sevkiyata böler.
- İstek: `{ splitPackageDetails: [ { items: [ { id: number }, ... ] } ] }`. Her eleman bir **paket**; **items** o pakette yer alacak kalemlerin id’leri (shipment list cevabındaki `items[].id`). Gönderilmeyen item’lar otomatik olarak **yeni bir shipment**’a eklenir.
- İşlem sonrası aynı **orderNumber** üzerinde yeni **shipmentId**(ler) oluşur. Eski shipment’in statüsü **shipment_split** olur. Güncel shipment’lar için **list** servisi tekrar çağrılmalıdır.

**Projede:** `idefixSplitPackage(creds, shipmentId, splitPackageDetails)` ✅ | API: `POST /api/idefix/orders/split-package` ✅ (body: shipmentId, splitPackageDetails)

---

## 4. Tedarik Edilememe (noship / unsupplied)

- Ürünlerin **tedarik edilememesi** durumunda **unsupplied** servisi ile shipment **shipment_unsupplied** statüsüne güncellenir. Sebep ID’leri **reasons/noship** listesinden alınır.

### Tedarik Edememe Sebep Listesi (reasons/noship)

- **GET** `oms/{vendorId}/reasons/noship` — unsupplied servisine istekte gönderilecek **sebep bilgilerine ait ID** değerleri buradan alınır.
- Yanıt: Dizi — `id`, `name`, `reasonType` (noship), `description`, `createdAt`, `updatedAt`, `deletedAt`.

**Projede:** `idefixGetNoshipReasons(creds)` ✅ | API: `GET /api/idefix/orders/reasons/noship` ✅

### Tedarik Edilemedi Bildirimi (unsupplied)

- **POST** `oms/{vendorId}/{shipmentId}/unsupplied` — Shipment içindeki tedarik edilemeyen ürün(ler) iptal. İstek: `{ items: [ { id, reasonId } ] }`. id = item ID (list items[].items[].id), reasonId = reasons/noship. Kalan ürünlerle yeni shipment oluşur; list tekrar çekilir. **Projede:** `idefixUnsupplied` ✅ | API: `POST /api/idefix/orders/unsupplied` ✅

### İptal sebep listesi (reasons/cancel)

- **GET** `oms/{vendorId}/reasons/cancel` — Müşteri iptallerinin sebep ID listesi. Yanıt: `[{ id, name, reasonType: "cancel", description, createdAt, updatedAt, deletedAt }]`.

**Projede:** `idefixGetCancelReasons(creds)` ✅ | API: `GET /api/idefix/orders/reasons/cancel` ✅

---

## 5. Fatura Linki Gönderme (invoice-link)

- **POST** `oms/{vendorId}/{shipmentId}/invoice-link` — Satıcının kendi sisteminde oluşan **e-Arşiv** veya **e-Fatura** linkinin İdefix’e iletilmesi için kullanılır.
- İstek: `{ invoiceLink: "https://faturalinki.com" }`. **shipmentId** path’te (fatura linkinin gönderileceği sevkiyat ID; list cevabındaki `items[].id`).

**Projede:** `idefixSendInvoiceLink(creds, shipmentId, invoiceLink)` ✅ | API: `POST /api/idefix/orders/invoice-link` ✅ (body: shipmentId, invoiceLink)

---

## 6. Kargo Kodu Bildirme (update-tracking-number)

- **POST** `oms/{vendorId}/{shipmentId}/update-tracking-number` — Sevkiyat için kargo takip numarası ve takip URL’i bildirilir. Sipariş statüsü **shipment_in_cargo** olarak otomatik güncellenir.
- İstek: `{ trackingUrl: "string", trackingNumber: "string" }`. **trackingUrl** gönderilen kargo firmasıyla uyumlu olmalıdır; takip URL’i ile siparişte seçilmiş kargo profili uyuşmazlığında sistem uyarı/hata verir; bu durumda **change-cargo-provider** servisi ile doğru kargo bilgisi gönderilmelidir.

**Projede:** `idefixUpdateTrackingNumber(creds, shipmentId, { trackingUrl, trackingNumber })` ✅ | API: `POST /api/idefix/orders/update-tracking-number` ✅ (body: shipmentId, trackingUrl, trackingNumber)

---

## 7. Alternatif Teslimat ile Gönderim (alternative-cargo-tracking)

- **POST** `oms/{vendorId}/{shipmentId}/alternative-cargo-tracking` — Alternatif teslimat (kendi aracım, servis vb.) veya platformun kargo durumunu sorgulayamadığı kargolar için takip numarası/takip URL bildirimi.
- **vendorCargoProfile\*** — Satıcının alternatif teslimatta kullanılacak profil ID. **vendor/profile/list** metodundan dönen **isSellerTrackingSupport** ve **isPlatformAgreementSupport** değerleri **false** olan profiller kullanılmalıdır.
- **trackingInfo** — `trackingUrl`: isPhoneNumber false ise zorunlu (kargo takip URL). `phoneNumber`: isPhoneNumber true ise zorunlu (alternatif teslimat telefon numarası).
- **isPhoneNumber** — true ise **phoneNumber** zorunlu; false ise **trackingUrl** zorunlu.
- Opsiyonel: **trackingNumber**, **boxQuantity**, **desi**.

**Projede:** `idefixAlternativeCargoTracking(creds, shipmentId, payload)` ✅ | API: `POST /api/idefix/orders/alternative-cargo-tracking` ✅ (body: shipmentId, vendorCargoProfile, isPhoneNumber, trackingInfo, trackingNumber?, boxQuantity?, desi?)

---

## 8. Teslim Edildi Bilgisi Gönderme (manual-deliver)

- **POST** `oms/{vendorId}/{shipmentId}/manual-deliver` — Alternatif kargo ile yapılan gönderimler için teslim bilgisinin bildirimi.
- **shipmentId\*** — Teslim bilgisi gönderilecek shipment ID (path’te).
- İstek body (opsiyonel): `{ deliverDocumentUrl?: "string", deliveryCode?: "string" }`.

**Projede:** `idefixManualDeliver(creds, shipmentId, { deliverDocumentUrl?, deliveryCode? })` ✅ | API: `POST /api/idefix/orders/manual-deliver` ✅ (body: shipmentId, deliverDocumentUrl?, deliveryCode?)

---

## 9. Desi, Koli Bilgisi Gönderme (update-box-info)

- **POST** `oms/{vendorId}/{shipmentId}/update-box-info` — Lojistik kargo gönderileri için desi ve koli sayısı bildirimi.
- **shipmentId\*** — Bilgi gönderilecek shipment ID (path’te).
- İstek body: `{ boxQuantity: number, desi: number }` (koli sayısı, desi).

**Projede:** `idefixUpdateBoxInfo(creds, shipmentId, { boxQuantity, desi })` ✅ | API: `POST /api/idefix/orders/update-box-info` ✅ (body: shipmentId, boxQuantity, desi)

---

## 10. Gönderi Seçeneği Değişikliği (change-cargo-provider)

- **POST** `oms/{vendorId}/{shipmentId}/change-cargo-provider/{vendorCargoProfile}` — Platform öder anlaşmalı veya platform tarafından takip edilebilen shipment'ların gönderi kargosu değiştirilir (örn. update-tracking-number'da takip URL ile kargo profili uyuşmazlığında).
- **shipmentId\*** — Kargo değiştirilecek shipment ID (path’te).
- **vendorCargoProfile\*** — Yeni kargo profil ID (path’te). **vendor/cargo-company/profile** metodundan dönen, **isSellerTrackingSupport** veya **isPlatformAgreementSupport** değerlerinden en az biri **true** olan profiller kullanılmalıdır.

**Projede:** `idefixChangeCargoProvider(creds, shipmentId, vendorCargoProfile)` ✅ | API: `POST /api/idefix/orders/change-cargo-provider` ✅ (body: shipmentId, vendorCargoProfile)

---

## 11. İşçilik Bedeli Gönderme (update-labor-cost-amount)

- **POST** `oms/{vendorId}/update-labor-cost-amount` — Sipariş kalemleri için işçilik bedeli tutarı iletilir.
- İstek: `{ laborCostAmountItemRequests: [ { orderItemId: number, laborCostAmount: number } ] }`. **orderItemId:** İşçilik bedeli gönderilecek ürünün (order item) id'si. **laborCostAmount:** İşçilik bedeli tutarı (0'dan küçük olamaz, item'in faturalandırılacak tutarından büyük olamaz).
- Sevkiyat statüsü **delivered** olana kadar bu servise istek gönderilebilir; delivered sonrası güncelleme yapılamaz. Yalnızca belirli kategori ID'leri için beslenebilir.
- Yanıt: laborCostAmountItemRequests, laborCostAmountData (dizi).

**Projede:** `idefixUpdateLaborCostAmount(creds, laborCostAmountItemRequests)` ✅ | API: `POST /api/idefix/orders/update-labor-cost-amount` ✅

---

## 12. İade Listesi (claim-list)

- **GET** `oms/{vendorId}/claim-list` — İdefix’te iade talebi oluşan shipment’ları listeler.

### Parametreler

| Parametre | Açıklama |
|-----------|----------|
| ids | Tekil iade detayı için claim ID (virgül ile birden fazla). |
| orderNumber | Ana sipariş numarası. |
| claimReason | Belirli reason ID’ye göre claim’leri filtreler. |
| startDate | Bu tarihten sonraki iadeler. Format: `2022/09/30 23:59:59` |
| endDate | Bu tarihe kadar olan iadeler. Format: `2022/09/30 23:59:59` |
| lastUpdatedAt | İade durumunun son güncellenme tarihi. Format: `2022/09/30 23:59:59` |
| page, limit | Sayfalama. |

### Yanıt (özet)

- **Header:** totalCount, itemCount, pageCount, currentPage, limit.
- **items[]:** Her biri: id, orderNumber, customerName, createdAt, orderCreatedAt, cargoTrackingUrl, cargoTrackingNumber, cargoKey, cargoCompanyName, cargoProfileName, cargoTypeName, **items[]** (kalemler: productName, barcode, state, stateName, vendorReasonId, customerReasonId, approvedAt, vb.).

### İade (claim) statüleri

| Değer | Açıklama |
|-------|----------|
| ready | İade oluştu; müşteri iade butonuna bastı. |
| in_cargo | Müşteri ürünü kargoya verdi; ürün kargoda. |
| waiting_vendor_approve | İade satıcı deposuna ulaştı; satıcı onay/red verecek. |
| approved | İade onaylandı. |
| decline | İade reddedildi. |
| vendor_decline_request | Satıcı red talebi gönderdi; sistem kontrol ediyor. |

**Projede:** `idefixGetClaimList(creds, params)` ✅ | API: `GET /api/idefix/orders/claim-list` ✅ (query: ids, orderNumber, claimReason, startDate, endDate, lastUpdatedAt, page, limit)

### İade talebi oluşturma (claim-create)

- **POST** `oms/{vendorId}/claim-create` — Müşteri iade kodu almadan depoya iletilen siparişler için iade talebi oluşturur. Oluşturulan iade **claim-list** ile çekilir.
- **customerId\*** — Siparişi veren müşterinin İdefix müşteri ID’si.
- **orderNumber** — Ana sipariş numarası (opsiyonel; dokümanda zorunlu olabilir).
- **vendorCargoCompanyId** — Kargo firması ID (opsiyonel; dokümanda zorunlu olabilir).
- **vendorCargoProfileId** — İade talebinde kullanılan kargo profil ID (opsiyonel).
- **items\*** — `[{ reasonId, orderLineId, customerNote? }]`. **reasonId:** claim-reasons’tan. **orderLineId:** İade edilecek kalem ID. **customerNote** opsiyonel.
- **images** — Görsel URL dizisi (opsiyonel).
- **claimType** — Gönderim türü, örn. "Kargo Subesinden", "Evden" (opsiyonel).

**Projede:** `idefixClaimCreate(creds, payload)` ✅ | API: `POST /api/idefix/orders/claim-create` ✅ (body: customerId, items, orderNumber?, vendorCargoCompanyId?, vendorCargoProfileId?, images?, claimType?)

### İade talep sebep listesi (claim-reasons)

- **GET** `oms/{vendorId}/claim-reasons` — claim-create isteklerinde gönderilecek ve claim-list’te dönen iade sebep ID’lerinin listesi. Yanıt: `[{ id, name, type }]` — **type:** platform | customer.

**Projede:** `idefixGetClaimReasons(creds)` ✅ | API: `GET /api/idefix/orders/claim-reasons` ✅

### İade talep onayı (claim-approve)

- **POST** `oms/{vendorId}/{claimId}/claim-approve` — Depoya teslim edilmiş iade taleplerindeki kalemleri onaylar.
- **claimId\*** — İade talep ID (path; claim-list items[].id).
- **claimLineIds\*** — Onaylanacak kalem ID’leri (body; claim-list items[].items[].id). Örnek: `["14","13"]`.

**Projede:** `idefixClaimApprove(creds, claimId, claimLineIds)` ✅ | API: `POST /api/idefix/orders/claim-approve` ✅ (body: claimId, claimLineIds)

### İade red talebi sebep listesi (claim-decline-reasons)

- **GET** `oms/claim-decline-reasons` — claim-decline-request isteklerinde gönderilecek iade red sebep ID’leri (path vendorId içermez). Yanıt: `[{ id, name, description, createdAt, updatedAt, deletedAt }]`.

**Projede:** `idefixGetClaimDeclineReasons(creds)` ✅ | API: `GET /api/idefix/orders/claim-decline-reasons` ✅

### İade red talebi oluşturma (claim-decline-request)

- **POST** `oms/{vendorId}/{claimId}/claim-decline-request` — Depoya teslim edilmiş iade taleplerini inceleyip red talebi oluşturur.
- **claimId\*** — İade talep ID (path; claim-list items[].id).
- **claimLines\*** — Red edilecek kalemler: `[{ id, claimDeclineReasonId, description?, images? }]`. **id:** kalem ID (claim-list items[].items[].id). **claimDeclineReasonId:** claim-decline-reasons’tan. **description** ve **images** (URL dizisi) opsiyonel.

**Projede:** `idefixClaimDeclineRequest(creds, claimId, claimLines)` ✅ | API: `POST /api/idefix/orders/claim-decline-request` ✅ (body: claimId, claimLines)

### İade satıcıya ulaştı bildirimi (claim-delivered-to-vendor)

- **POST** `oms/{vendorId}/{claimId}/claim-delivered-to-vendor` — Depoya teslim edilmiş iadeler için, **onay veya red yapmadan önce** çalıştırılması gereken servis. Bu işlem sonrasında claim-approve veya claim-decline-request kullanılır.
- **claimId\*** — İade talep ID (path; claim-list items[].id).
- **claimLineIds\*** — İşlem yapılacak kalem ID’leri (body; claim-list items[].items[].id). Örnek: `[0]` veya `["14","13"]`.

**Projede:** `idefixClaimDeliveredToVendor(creds, claimId, claimLineIds)` ✅ | API: `POST /api/idefix/orders/claim-delivered-to-vendor` ✅ (body: claimId, claimLineIds)

---

## Özet Tablo

| Akış | Açıklama | Proje durumu |
|------|----------|--------------|
| Sevkiyat listesi | GET oms/{vendorId}/list | ✅ idefixGetShipmentList + API route |
| İşçilik bedeli gönderme | POST oms/{vendorId}/update-labor-cost-amount | ✅ idefixUpdateLaborCostAmount + API route |
| Shipment statü güncelleme | POST oms/{vendorId}/{shipmentId}/update-shipment-status | ✅ idefixUpdateShipmentStatus + API route |
| Sipariş bölme | POST oms/{vendorId}/{shipmentId}/split-package | ✅ idefixSplitPackage + API route |
| Noship sebep listesi | GET oms/{vendorId}/reasons/noship | ✅ idefixGetNoshipReasons + API route |
| İptal sebep listesi | GET oms/{vendorId}/reasons/cancel | ✅ idefixGetCancelReasons + API route |
| Tedarik edilemedi bildirimi | POST oms/{vendorId}/{shipmentId}/unsupplied | ✅ idefixUnsupplied + API route |
| Fatura linki gönderme | POST oms/{vendorId}/{shipmentId}/invoice-link | ✅ idefixSendInvoiceLink + API route |
| Kargo kodu bildirme | POST oms/{vendorId}/{shipmentId}/update-tracking-number | ✅ idefixUpdateTrackingNumber + API route |
| Alternatif teslimat ile gönderim | POST oms/{vendorId}/{shipmentId}/alternative-cargo-tracking | ✅ idefixAlternativeCargoTracking + API route |
| Teslim edildi bilgisi gönderme | POST oms/{vendorId}/{shipmentId}/manual-deliver | ✅ idefixManualDeliver + API route |
| Desi, koli bilgisi gönderme | POST oms/{vendorId}/{shipmentId}/update-box-info | ✅ idefixUpdateBoxInfo + API route |
| Gönderi seçeneği değişikliği | POST oms/{vendorId}/{shipmentId}/change-cargo-provider/{vendorCargoProfile} | ✅ idefixChangeCargoProvider + API route |
| İade listesi | GET oms/{vendorId}/claim-list | ✅ idefixGetClaimList + API route |
| İade talebi oluşturma | POST oms/{vendorId}/claim-create | ✅ idefixClaimCreate + API route |
| İade talep sebep listesi | GET oms/{vendorId}/claim-reasons | ✅ idefixGetClaimReasons + API route |
| İade talep onayı | POST oms/{vendorId}/{claimId}/claim-approve | ✅ idefixClaimApprove + API route |
| İade red talebi sebep listesi | GET oms/claim-decline-reasons | ✅ idefixGetClaimDeclineReasons + API route |
| İade red talebi oluşturma | POST oms/{vendorId}/{claimId}/claim-decline-request | ✅ idefixClaimDeclineRequest + API route |
| İade satıcıya ulaştı bildirimi | POST oms/{vendorId}/{claimId}/claim-delivered-to-vendor | ✅ idefixClaimDeliveredToVendor + API route |
