# Hepsiburada Sipariş Webhook Kurulumu

## Webhook için zorunlu testler (canlıya almadan önce)

Aşağıdaki adımları tamamladıktan sonra Hepsiburada sipariş tarafını canlıya alabilirsiniz.

| # | Test | Nasıl yapılır | Tamamlandı |
|---|------|----------------|------------|
| 1 | **Webhook URL’i Hepsiburada’ya kayıt** | Entegrasyon ekibine webhook URL, Basic Auth kullanıcı/şifre ve Transaction Type listesini iletin (aşağıdaki “Hepsiburada’ya verilecek bilgiler” tablosu). | ☐ |
| 2 | **.env’de webhook kimliği** | `HB_WEBHOOK_USERNAME` ve `HB_WEBHOOK_PASSWORD` değerleri Hepsiburada’ya verdiğinizle **birebir aynı** olsun. | ☐ |
| 3 | **Webhook endpoint sağlık kontrolü** | Tarayıcı veya Postman: `GET https://SIZIN_DOMAIN/api/hepsiburada-api/orders/webhook` + Basic Auth (webhook username/password). Yanıt **200** ve `success: true` olmalı. | ☐ |
| 4 | **Test siparişi oluşturma** | Panel: Hepsiburada → Siparişler → “Test siparişi oluştur” **veya** `POST /api/hepsiburada-api/orders/create-test`. İstek başarılı olmalı. | ☐ |
| 5 | **CreateOrderV2 webhook’unun düşmesi** | Test siparişi oluşturulunca Hepsiburada sizin endpoint’e **CreateOrderV2** POST atar. Sunucu log’unda webhook isteği görülmeli; yanıt **200** dönmeli. | ☐ |
| 6 | **Veritabanı kayıtları** | MongoDB’de `webhookEvents` koleksiyonunda yeni event, `hb_orders` koleksiyonunda yeni sipariş kaydı oluşmalı. | ☐ |
| 7 | **Panelde sipariş görünümü** | Panel → Hepsiburada → Siparişler sayfasında “Yenile” yapın; oluşturulan test siparişi listede görünmeli. | ☐ |
| 8 | **(İsteğe bağlı) Teslimat webhook’ları** | Merchant SIT Portal’a giriş yapıp aynı siparişte “Kargoya ver” / “Teslim edildi” işaretleyin; DeliveryShippedV2, DeliveryDeliveredV2 gelmeli ve panelde sekme güncellenmeli. | ☐ |

**Not:** Adım 8 (teslimat webhook’ları) için Hepsiburada test portalına (merchant-sit) giriş gerekir. Portal erişiminiz yoksa 1–7 yeterli; canlıda gerçek siparişlerde teslimat webhook’ları zaten çalışır.

**Listeleme (katalog/stok/fiyat) testleri:** Bunlar ayrı bir süreçtir (bkz. `docs/HEPSIBURADA-URUN-KATALOG.md` §8). Sipariş webhook’unu canlıya almak için yukarıdaki 1–7 (ve isteğe bağlı 8) yeterlidir; listeleme canlıya geçişi ayrıca Hepsiburada ile tamamlanır.

---

## Canlıya alma checklist (Hepsiburada sipariş / webhook)

Testler tamamlandıktan sonra:

| # | Yapılacak | Tamamlandı |
|---|-----------|------------|
| 1 | **Canlı webhook kaydı** | Hepsiburada **canlı** satıcı hesabında webhook’u kaydedin: aynı endpoint URL (`https://SIZIN_CANLI_DOMAIN/api/hepsiburada-api/orders/webhook`), canlı için kullanacağınız Basic Auth kullanıcı/şifre, Transaction Type: CreateOrderV2, CancelOrderLineV2, DeliveryShippedV2, DeliveryDeliveredV2, DeliveryUndeliveredV2. | ☐ |
| 2 | **.env canlı değerleri** | Canlı Merchant ID, Secret (veya AUTH Base64), User-Agent; `HEPSIBURADA_OMS_BASE_URL=https://oms-external.hepsiburada.com` (siparişler için). `HB_WEBHOOK_USERNAME` / `HB_WEBHOOK_PASSWORD` canlı webhook kaydındaki kimlikle aynı olsun. | ☐ |
| 3 | **Panel API Ayarları** | Hepsiburada için test modunu kapatın (Test modu: kapalı) ve canlı Merchant ID / kullanıcı adı / şifre girin (veya .env kullanıyorsanız paneli canlı bilgilerle uyumlu bırakın). | ☐ |
| 4 | **Deploy / sunucu** | Uygulama canlı ortamda (satistakip.online veya kendi domain’iniz) çalışıyor olsun; webhook URL’i Hepsiburada’nın erişebileceği bir adres olsun. | ☐ |
| 5 | **Canlı sipariş denemesi** | Canlı hesapta gerçek (veya test) bir sipariş oluşunca webhook’un düştüğünü ve siparişin panelde göründüğünü kontrol edin. | ☐ |

---

## Hepsiburada ile ne yapalım? (Özet)

| Ne? | Durum / Aksiyon |
|-----|------------------|
| **Sizin tarafta hazır olan** | Webhook endpoint, test sipariş API’si, env helper, panelde Hepsiburada siparişleri. |
| **Şu an yapabileceğiniz** | (1) `.env`’i doldurup sunucuyu ayağa kaldırın. (2) **Test siparişi oluşturun:** `POST /api/hepsiburada-api/orders/create-test` — böylece CreateOrderV2 webhook tetiklenir, sipariş panelde görünür. (3) Webhook’un 200 döndüğünü ve `webhookEvents` / `hb_orders` kayıtlarını kontrol edin. |
| **Portal girişi gelince** | Merchant SIT Portal’a (tigdesithalat@gmail.com / Hb12345!) giriş yapıp siparişi bulun; “Kargoya ver”, “Teslim edildi” vb. işaretleyerek DeliveryShippedV2, DeliveryDeliveredV2 webhook’larını test edin. |
| **Hepsiburada’dan isteyeceğiniz** | (1) Merchant SIT Portal’a giriş yapamıyorsanız: “Test portal giriş yapamıyorum (tigdesithalat@gmail.com). Güncel URL ve hesap aktivasyonu talep ediyorum.” (2) İsterseniz: Order Simulation ekranı yetkisi (test siparişi portalda da oluşturmak için). |

Yani: **Kod tarafı hazır; siz .env’i verip create-test ile sipariş üretin, webhook’u doğrulayın. Portal erişimi gelene kadar teslimat webhook’larını bekleyin veya Hepsiburada’dan portal erişimini talep edin.**

---

## Hepsiburada’ya verilecek bilgiler

Webhook kaydı için aşağıdaki bilgileri Hepsiburada’ya iletin:

| Alan | Değer |
|------|--------|
| **Base URL** | `https://www.satistakip.online/api/hepsiburada-api/orders/webhook` |
| **Username** | `07283889-aa00-4809-9d19-b76d97f9bebd` |
| **Password** | `ttFE8CrzpC8a` |
| **Transaction Type** | `CreateOrderV2`, `CancelOrderLineV2`, `DeliveryDeliveredV2`, `DeliveryCreated`, `DeliveryShippedV2`, `DeliveryUndeliveredV2` (Intransit, undeliver, deliver) |
| **User-Agent** | `tigdes_dev` |

## Sunucu tarafı (.env)

Webhook’un çalışması için proje `.env` dosyasında **aynı** kullanıcı adı ve şifreyi tanımlayın:

```env
# Test ortamı: HEPSIBURADA_* + HB_WEBHOOK_* (HEPSIBURADA_AUTH = MerchantId:Secret Base64)
HEPSIBURADA_MERCHANT_ID=07283889-aa00-4809-9d19-b76d97f9bebd
HEPSIBURADA_AUTH=MDcyODM4ODktYWEwMC00ODA5LTlkMTktYjc2ZDk3ZjliZWJkOnR0RkU4Q3J6cEM4YQ==
HEPSIBURADA_USER_AGENT=tigdes_dev
HEPSIBURADA_BASE_URL=https://mpop-sit.hepsiburada.com
HB_WEBHOOK_USERNAME=mywebhook
HB_WEBHOOK_PASSWORD=supersecret123
```

İsteğe bağlı (sipariş detayı OMS’ten çekilirken kullanılır):

Eski env isimleri de geçerli: HB_MERCHANT_ID, HB_SECRET_KEY veya HB_PASSWORD, HB_USER_AGENT.

**Canlı ortam örneği:**

```env
HEPSIBURADA_MERCHANT_ID=b95f26b8-d9ba-49a6-b148-54ea2405c3bc
HEPSIBURADA_SECRET_KEY=prjZRKtY3wP3
HEPSIBURADA_AUTH=Yjk1ZjI2YjgtZDliYS00OWE2LWIxNDgtNTRlYTI0MDVjM2JjOnByalpSS3RZM3dQMw==
HEPSIBURADA_USER_AGENT=satistakiponline_dev
HEPSIBURADA_OMS_BASE_URL=https://oms-external.hepsiburada.com
HB_WEBHOOK_USERNAME=<canlı webhook kullanıcı adı>
HB_WEBHOOK_PASSWORD=<canlı webhook şifresi>
```

## Canlıya geçiş — anlık veriler sisteminize akar

Canlıya geçtiğinizde **aynı webhook ve aynı kod** kullanılır; Hepsiburada canlı siparişleri anlık olarak panelinize ve ERP'ye akar.

| Ne yapılır? | Açıklama |
|-------------|----------|
| **Webhook URL** | Canlıda da aynı endpoint: `https://SIZIN_CANLI_DOMAIN/api/hepsiburada-api/orders/webhook` (örn. satistakip.online). |
| **.env canlı değerler** | Canlı Merchant ID, Secret (veya AUTH Base64), User-Agent; sipariş API için `HEPSIBURADA_OMS_BASE_URL=https://oms-external.hepsiburada.com`. `HB_WEBHOOK_USERNAME` / `HB_WEBHOOK_PASSWORD` Hepsiburada canlı webhook kaydındaki kimlikle aynı olsun. |
| **Hepsiburada canlı hesap** | Canlı satıcı hesabında webhook'u kaydedin: yukarıdaki URL + Basic Auth. Transaction Type: CreateOrderV2, CancelOrderLineV2, DeliveryShippedV2, DeliveryDeliveredV2, DeliveryUndeliveredV2 vb. |
| **Akış** | Canlıda yeni sipariş gelince HB bu URL'e POST atar → sipariş `hb_orders`'a yazılır → panelde görünür. "ERP'ye aktar" ile Cari + Satış oluşur. İptal webhook'u gelince ERP'de satış iptali oluşturulur. |

**Özet:** Canlıya geçince sadece .env ve Hepsiburada tarafındaki webhook kaydı canlı bilgilerle güncellenir; kod değişmez, anlık veriler sisteminize akmaya devam eder.

## Davranış

- **GET** `/api/hepsiburada-api/orders/webhook`  
  Basic Auth ile 200 döner (URL doğrulama / sağlık kontrolü).

- **POST** — Desteklenen event tipleri:
  - **CreateOrderV2 / OrderCreate:** Yeni sipariş; `hb_orders` koleksiyonuna yazılır.
  - **CancelOrderLineV2 / CancelOrderLine:** Satır/sipariş iptali; durum iptal olarak güncellenir.
  - **DeliveryCreated:** Teslimat oluşturuldu.
  - **DeliveryShippedV2:** Kargoya verildi (InTransit).
  - **DeliveryDeliveredV2:** Teslim edildi (Delivered).
  - **DeliveryUndeliveredV2:** Teslim edilemedi (Undelivered).

Tüm istekler `webhookEvents` koleksiyonuna loglanır. Siparişler panelde **Hepsiburada → Siparişler** sayfasında görünür.

## Sipariş akışı – Hepsiburada ile uyum

Paneldeki **Sipariş süreci** sekmeleri (Paketlenecek, Gönderime hazır, Kargoda, Teslim edildi, Teslim edilemedi, Ödemesi bekleniyor, İptal edildi) Hepsiburada webhook event’leri ile entegre çalışır:

| Panel sekmesi        | Hepsiburada webhook / durum | DB’deki status (gösterim) |
|----------------------|-----------------------------|----------------------------|
| Paketlenecek         | CreateOrderV2, OrderCreated | AwaitingShipment, OrderCreated, CreateOrderV2 |
| Gönderime hazır      | DeliveryCreated             | ReadyToShip, DeliveryCreated |
| Kargoda              | DeliveryShippedV2            | Shipped, InTransit, DeliveryShippedV2 |
| Teslim edildi        | DeliveryDeliveredV2         | Delivered, DeliveryDeliveredV2 |
| Teslim edilemedi     | DeliveryUndeliveredV2       | Undelivered, DeliveryUndeliveredV2 |
| Ödemesi bekleniyor   | (ödeme bekleyen siparişler) | PaymentAwaiting |
| İptal edildi         | CancelOrderLineV2, OrderCancelled | Cancelled, CancelOrderLineV2, OrderCancelled |

Hepsiburada teslimat event’i (DeliveryShippedV2, DeliveryDeliveredV2, DeliveryUndeliveredV2) geldiğinde siparişin `data.status` / `data.orderStatus` alanları da güncellenir; böylece sipariş panelde doğru sekmeye (Kargoda / Teslim edildi / Teslim edilemedi) düşer.

## Test senaryoları (adım adım)

Aşağıdaki sırayla ilerleyerek test siparişi ve webhook'u doğrulayabilirsiniz.

| Adım | Yapılacak | Kontrol |
|------|-----------|---------|
| 1 | **Webhook'u Hepsiburada'ya kaydettirin** | "Hepsiburada'ya verilecek bilgiler" tablosundaki URL, Username, Password ve Transaction Type değerlerini entegrasyon ekibine iletin. |
| 2 | **.env'de webhook kimliğini tanımlayın** | `HB_WEBHOOK_USERNAME` ve `HB_WEBHOOK_PASSWORD` Hepsiburada'ya verdiğiniz değerlerle aynı olsun. |
| 3 | **Test siparişi oluşturun** | Panel: Hepsiburada → Siparişler → "Test siparişi oluştur" veya `POST /api/hepsiburada-api/orders/create-test`. |
| 4 | **Webhook'un tetiklenmesini kontrol edin** | CreateOrderV2 isteği endpoint'inize düşmeli; yanıt 200 olmalı. `webhookEvents` ve `hb_orders` koleksiyonlarında kayıt oluşmalı. |
| 5 | **Panelde siparişi görün** | Hepsiburada → Siparişler sayfasında "Yenile" yapın; oluşturulan sipariş listede görünmeli. |
| 6 | **Teslimat webhook'ları (isteğe bağlı)** | Merchant SIT Portal'a giriş yapıp siparişte "Kargoya ver" / "Teslim edildi" işaretleyin; DeliveryShippedV2, DeliveryDeliveredV2 ve sipariş durumu güncellemesini kontrol edin. |

---

## Test akışı — Ne zaman nereye gireceksiniz?

### 1) Test siparişi oluşturma (Hepsiburada’ya giriş gerekmez)

Siparişi **sizin sisteminizden** oluşturuyorsunuz:

- Panelden veya Postman’den: **`POST /api/hepsiburada-api/orders/create-test`** çağrısı yapın.  
  Bu istek Hepsiburada test ortamına (STUB) sipariş gönderir; sipariş oluşunca Hepsiburada **CreateOrderV2** webhook’unu sizin endpoint’inize atar, sipariş panelde “Hepsiburada → Siparişler”de görünür.

Bu adımda **Hepsiburada test hesabına giriş yapmanız gerekmez.**

---

### 2) Teslimat adımlarını ilerletme (Hepsiburada’ya giriş gerekir)

**DeliveryShippedV2**, **DeliveryDeliveredV2**, **DeliveryUndeliveredV2** gibi webhook’ları tetiklemek için siparişin durumunu “kargoya verildi / teslim edildi” vb. olarak değiştirmeniz gerekir. Bu işlem **Hepsiburada satıcı portalında** yapılıyor:

- **Hepsiburada test satıcı portalına** giriş yapın (test hesabı: **tigdes_test**, e‑posta: **tigdesithalat@gmail.com** — Hepsiburada’nın size verdiği giriş bilgileri).
- Açılan siparişi bulun (create-test ile oluşturduğunuz sipariş numarasıyla).
- Portal üzerinden adımları ilerletin: örn. “Kargoya ver”, “Teslim edildi” veya “Teslim edilemedi” işaretleyin.  
  Bu adımlar tetiklenince Hepsiburada sizin webhook URL’inize **DeliveryShippedV2**, **DeliveryDeliveredV2**, **DeliveryUndeliveredV2** gönderir.

Yani: **Teslimat webhook’larını test etmek için evet, Hepsiburada test hesabına giriş yapıp portal üzerinden ilerleyeceksiniz.**

---

### 3) Order Simulation (isteğe bağlı)

Hepsiburada “Order Simulation” ekranına erişim verirse, test siparişini **portalda** da oluşturabilirsiniz (create-test API’sine alternatif). Şu an bu ekran sizde yoksa, Hepsiburada’dan **tigdes_test / tigdesithalat@gmail.com** için Order Simulation yetkisi talep etmeniz gerekir. Yetki gelene kadar test siparişi için **sadece create-test API’sini** kullanmanız yeterli.

---

### 4) Merchant SIT Portal giriş (test hesabı)

Teslimat adımlarını ilerletmek veya siparişleri görmek için Merchant SIT Portal sayfasına giriş yapmanız gerekir.

| Alan | Değer |
|------|--------|
| **Portal URL** | https://merchant-sit.hepsiburada.com/v2/login |
| **Username** | tigdesithalat@gmail.com |
| **Password** | Hb12345! |

**Hesaba erişemiyorsanız:** Giriş sayfası açılmıyorsa veya "yanlış kullanıcı/şifre" alıyorsanız bu konu Hepsiburada tarafındadır. (1) Önce https://merchant-sit.hepsiburada.com/v2/login adresini deneyin; Hepsiburada farklı bir link verdi ise onu kullanın. (2) Kullanıcı adı ve şifreyi aynen girin: tigdesithalat@gmail.com ve Hb12345! (3) Giriş yine olmazsa Hepsiburada destek veya entegrasyon ekibine "Test portal giriş yapamıyorum (tigdesithalat@gmail.com). Merchant SIT Portal güncel URL ve hesap aktivasyonu talep ediyorum." diye yazın; erişim sadece onlar tarafından açılabilir.

---

## Sık karşılaşılan hata: "Değişiklik bulunamadı" (Kargoya teslim et)

**Ne zaman:** Merchant SIT Portal’da "Kargoya teslim et" ekranında takip numarası (örn. HBTEST0001) ve takip linki girip "Onayla" dediğinizde bu hata çıkabilir.

**Sebep:** Hepsiburada, onay vermeden önce o takip numarası için **en az bir kargo hareketi** (kurye tarafından okunma / ACCEPTED) bekler. Dokümana göre: "Kargo hareketleri kurye tarafından okunduktan sonra görünür (ACCEPTED). Gönderi herhangi bir işlem almadıysa" sistem "değişiklik yok" gibi yanıt verebilir. Yani panel, kargo entegrasyonundan gelen bir **durum güncellemesi** görmeden "Kargoya teslim et"i tamamlamaz.

**Yapılabilecekler:**

1. **Test barkod formatını kullanın**  
   Hepsiburada dokümanında test ortamı için örnek barkod formatı: **`TST1000000000001`** (veya `TST1000000000002`, `TST1000000000003` …). "Kargo bilgisi gir" ekranında **Takip numarası** alanına `TST1000000000001` yazıp tekrar deneyin. (Bazı SIT ortamlarında sadece bu format simüle ediliyor olabilir.)

2. **Test siparişinde CargoCompanyId**  
   Test siparişi oluştururken **CargoCompanyId: 89100** kullanılmalı; aksi takdirde SIT’te süreç ilerletilemeyebilir. create-test API’sinde bu değer zaten 89100 olarak gönderiliyor.

3. **Biraz bekleyin**  
   Bazen SIT’te kargo simülasyonu gecikmeli çalışır; birkaç dakika sonra aynı takip numarasıyla tekrar "Onayla" deneyin.

4. **Hepsiburada’ya netleştirin**  
   Hâlâ ilerlemiyorsa Hepsiburada entegrasyon ekibine şunu iletin: "Merchant SIT’te 'Kargoya teslim et' adımında takip numarası girip Onayla’ya basınca 'Değişiklik bulunamadı' hatası alıyorum. Test ortamında hangi takip numarası (barkod) formatını kullanmalıyım ve kargo durum değişikliği (ACCEPTED) SIT’te nasıl simüle ediliyor?"

Referans: [Kargo hareketi sorgulama (takip URL)](https://developers.hepsiburada.com/hepsiburada/reference/post_delivery-integration-track) — kargo hareketleri kurye okuması (ACCEPTED) sonrası görünür.

---

## Test siparişi oluşturma (API detayı)

- **API:** `POST /api/hepsiburada-api/orders/create-test`  
  (HB_MERCHANT_ID, HB_SECRET_KEY veya HB_PASSWORD, HB_USER_AGENT ortam değişkenleri gerekir.)
- **CargoCompanyId:** 89100 kullanılır; portal üzerinden teslimat adımlarını ilerletebilmek için Hepsiburada’nın talebidir.
- **Doküman:** https://developers.hepsiburada.com/hepsiburada/reference/post_orders-merchantid-merchantid

---

## Test linkleri (kopyala-yapıştır)

**Sunucu taban URL:** `https://www.satistakip.online` veya `http://localhost:3000`

| Ne | Link |
|----|------|
| Webhook (Hepsiburada buraya POST atar) | https://www.satistakip.online/api/hepsiburada-api/orders/webhook |
| Test siparişi oluştur (POST) | https://www.satistakip.online/api/hepsiburada-api/orders/create-test |
| Sipariş listesi – DB (GET) | https://www.satistakip.online/api/hepsiburada-api/orders/local |
| Tek sipariş (GET, {orderNumber} yazın) | https://www.satistakip.online/api/hepsiburada-api/orders/{orderNumber} |
| Panel – Hepsiburada siparişler | https://www.satistakip.online/dashboard/hepsiburada/orders |
| Panel – Siparişler | https://www.satistakip.online/orders |
| Hepsiburada Merchant SIT Portal giriş | https://merchant-sit.hepsiburada.com/v2/login |
| Hepsiburada test sipariş dokümanı | https://developers.hepsiburada.com/hepsiburada/reference/post_orders-merchantid-merchantid |

---

## Hepsiburada test ortamı – resmi bilgiler (entegrasyon hesabı)

Hepsiburada’dan iletilen satıcı test hesabı ve development bilgileri.

**Test portal (Merchant SIT Portal):**
- Username: `tigdesithalat@gmail.com`
- Password: `Hb12345!`

**Development (API – Basic Authentication + User-Agent):**
- Merchant ID: `07283889-aa00-4809-9d19-b76d97f9bebd`
- Basic Auth Username (Merchantid): `07283889-aa00-4809-9d19-b76d97f9bebd`
- Basic Auth Password (Secretkey): `ttFE8CrzpC8a`
- Header User-Agent (Developer Username): `tigdes_dev`

**Dokümanlar:** Teknik problemler için Sıkça Sorulan Sorular; tüm modeller için Developer Portal (https://developers.hepsiburada.com/). Entegrasyon modelleri: Katalog Ürün Entegrasyonu, Listeleme Entegrasyonu, Sipariş Entegrasyonu, Sipariş Webhook Entegrasyonu – iletilen dokümanların takip edilmesi önemlidir.
