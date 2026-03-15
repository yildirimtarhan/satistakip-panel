# Taxten 2.1.8 / 2.1.10 – Zarf Durum Sorgusu, Tekrar Gönderim, CREDITNOTE

Bu belge Taxten Bulut e-Fatura dokümanlarındaki zarf durum sorgusu, tekrar gönderim ve CREDITNOTE kurallarının panelde nasıl karşılandığını özetler.

---

## 1. Bağlantı ve Ayarlar

- **URL:**
  - Test: `https://devrest.taxten.com/api/v1`
  - Canlı: `https://rest.taxten.com/api/v1`
- **Swagger:** Dev Rest Swagger / Canlı Rest Swagger (platform tarafından sağlanan adresler).
- **Protokol:** HTTPS, **HTTP Basic Authentication**.
- **Zaman aşımı önerisi:** 5 dakika.
- **UBL-TR uygunluk:** Şema/şematron kontrolleri platformda otomatik yapılır; dışarıdan imzalı belge kabul edilmez (imza entegratör tarafında atılır).

---

## 2.1 Fatura ve Uygulama Yanıtı Gönderme (SendUBL)

- **E-Fatura:** `POST /Invoice/SendUbl`
- **E-Arşiv:** `POST /EArchiveInvoice/SendUbl`

**İstek alanları:**

| Alan | Açıklama |
|------|----------|
| VKN_TCKN | Gönderici VKN/TCKN |
| SenderIdentifier | Gönderici etiketi (yalnızca zarfsız gönderimlerde) |
| ReceiverIdentifier | Alıcı etiketi (yalnızca zarfsız gönderimlerde) |
| DocType | Belge türü: ENVELOPE, INVOICE, APP_RESP |
| Parameters | Opsiyonel, çoklu (IS_DRAFT, RESEND:{EnvUUID}, vb.) |
| DocData | Ziplenmiş UBL XML verisi |
| Branch | Şube (opsiyonel) |
| OutputType | PDF, HTML (opsiyonel) |

**Cevap (çoklu):** EnvelopeId, DocumentId, Status, StatusDescription, ResponseCode, ResponseDescription, InvoiceUUID, InvoiceNumber, CustomerID, IssueDate, BinaryData.

- **Öneri:** Mümkün oldukça zarflı ve toplu gönderim kullanın. Zarfsız gönderimde SenderIdentifier/ReceiverIdentifier zorunludur.
- **İpucu:** Zip içindeki tek XML dosyasının adı ilgili UUID ile aynı olmalıdır.

**SOAP istek örneği (ENVELOPE):**

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ein="http:/taxten.com/eInvoice/">
  <soapenv:Header/>
  <soapenv:Body>
    <ein:sendUBLRequest>
      <ein:VKN_TCKN>3880718497</ein:VKN_TCKN>
      <ein:DocType>ENVELOPE</ein:DocType>
      <ein:DocData>cid:1522923210449</ein:DocData>
    </ein:sendUBLRequest>
  </soapenv:Body>
</soapenv:Envelope>
```

Panelde E-Fatura için `lib/taxten/taxtenClient.js` → `invoiceSendUbl()` → `/Invoice/SendUbl`; E-Arşiv için `pages/api/efatura/send.js` → `/EArchiveInvoice/SendUbl`.

### 2.1.1 Genel Bilgiler

- Bu metodla fatura ve uygulama yanıtları **toplu zarflı** veya **tek tek zarfsız** gönderilebilir. **Zarfsız gönderimde** etiket bilgisi için **SenderIdentifier** ve **ReceiverIdentifier** zorunludur.
- **Etiket kullanımı:**
  - **Fatura gönderimi:** Gönderici birim etiketi (GB) = SenderIdentifier, posta kutusu etiketi (PK) = ReceiverIdentifier.
  - **Uygulama yanıtı gönderimi:** PK = SenderIdentifier, GB = ReceiverIdentifier.
- **DocType:** Zarf gönderiminde `ENVELOPE`, fatura gönderiminde `INVOICE`, uygulama yanıtında `APP_RESP`. Mümkün olan her durumda zarflı ve mümkünse toplu gönderim yapılmalıdır.
- **Zip kuralı:** Zip içinde **tek bir UBL XML** bulunmalı; **dosya adı** gönderilen belge türüne göre **zarf UUID**, **fatura UUID** veya **UY UUID** ile aynı olmalıdır. Örnek: Fatura UUID `c674822e-cce4-48a9-a4e2-e7552aaee83a` ise zip içinde `c674822e-cce4-48a9-a4e2-e7552aaee83a.xml` adlı tek XML olmalı ve UBL fatura şemasına uygun olmalıdır. Zarf gönderiminde zarf UUID, UY gönderiminde UY UUID dosya adıyla eşleşmelidir.
- **Cevap:** Her oluşturulan belge için zarf UUID, fatura/UY UUID, fatura/UY ID ve (otomatik fatura ID kullanılıyorsa) müşteri fatura numarası (CustInvID) dönülür. Zarf içinde birden fazla fatura varsa her fatura için ayrı cevap öğesi döner.
- **UUID ve veri kaynağı:** Zarf, fatura ve uygulama yanıtı UUID’leri **müşteri sisteminde** oluşturulup UBL ile birlikte gönderilmelidir. Platform şema kontrollerinden sonra veriyi zenginleştirmeden kaydeder; gönderilen veri aynen GİB’e iletilir. İstisnalar: Fatura ID’lerinin sistem tarafından oluşturulması ve mevcut dijital imzaların sistem tarafından silinmesi.

### 2.1.2 Fatura ve Uygulama Yanıtı XML’inin Oluşturulması

- GİB’in **UBL-TR** standardına göre **UBL-Invoice-2.1.xsd** ve **UBL-ApplicationResponse-2.1.xsd** şemaları kullanılarak fatura ve uygulama yanıtı belgeleri oluşturulmalıdır.
- Şemalar: **http://efatura.gov.tr** teknik kılavuz ve paketlerinde; Taxten Bulut e-Fatura Müşteri WS API içinde `Bulut e-Fatura Müşteri WS API v2.0\EK1 - Teknik Belgeler\UBL-TR 1.2\XSD\maindoc` dosya yolu altında bulunur.

### 2.1.3 Dijital İmzalar

- Gönderilen fatura ve UY içinde **dijital imza düğümleri (UBLExtensions, Signature) bulunmamalıdır**. UBL şemasında zorunlu olsa da platform bu alanların varlığını kontrol etmez. Zorunluluk nedeniyle göndermek gereken sistemler **geçersiz imza** ile doldurabilir; platform bunları **sonradan siler**. Gerçek imzalar bu metodla yapılan gönderimlerden **sonra** zamanlanmış görevlerle entegratöre ait **mali mühür ve HSM** ile atılır; GİB’e düzgün imzalı belgeler iletilir. **Sistem dışarıdan imzalı belge kabul etmez.**

### 2.1.4 Sistem Yanıtları

- GİB’den gelen fatura ve uygulama yanıtı belgelerine ait **sistem yanıtları platform tarafından otomatik** oluşturulup GİB’e dönülür; bu metodla **sistem yanıtı veya sistem yanıtı zarfı gönderilemez**. Otomatik oluşan sistem yanıtı zarfları **getUBLList()** ile listelenip **getUBL()** ile müşteri sistemine aktarılabilir. Şema, şematron, imza ve mantıksal hata bulunmayan zarflara GİB kılavuzlarına uygun şekilde kısa sürede başarılı sistem yanıtı dönülür.

### 2.1.5 Fatura ID’leri ve Otomatik Üretilmesi

- e-Fatura’daki **fatura ID**’leri kağıt faturalardaki seri numarasına karşılık gelir; UBL’de **ID** alanında gönderilir/alınır. Müşteri üretebilir veya kayıt aşamasında **etiket başına** operasyon ekibi tarafından **otomatik üretim** tanımlanabilir. Aynı VKN/TCKN’de bir GB manuel, diğer GB otomatik olabilir; **aynı VKN/TCKN ile aynı fatura ID’li iki farklı fatura oluşturulamaz** (GİB hata verir).
- **Platformda otomatik ID:** Her GB etiketi için müşteri **iki alfanumerik karakterlik “ön ek”** (örn. AC, 5D) tanımlar. Oluşturulan ID formatı: **3 alfanumerik + düzenleme tarihi yılı + 9 haneli sıra** = toplam 16 karakter (örn. `IN02015000000001`). İlk 2 karakter GB ön eki; 3. karakter **tarih serisi**: en güncel fatura tarihiyle aynı gün → 0, daha eski → 1, daha da eski → 2 (örn. aynı gün `IN02015000000001`, 1 hafta önce `IN12015000000001`, 2 hafta önce `IN22015000000001`). Sıra numarası VKN/TCKN ve önek+yıl kombinasyonuna göre artar.
- **Otomatik ID kullanıldığında** her fatura için **Müşteri Fatura No (CustInvID)** gönderilmelidir; bu hem başarılı faturaların tekrar gönderilmesini engeller hem de hata alan zarflarda aynı fatura ID ile tekrar gönderimi sağlar.
- **Not:** Otomatik ID seçeneği ve GB ön ekleri, **o GB ile ilk fatura gönderildikten sonra** tutarlılık için değiştirilmemelidir.
- Fatura ID’leri etiket ve VKN/TCKN çifti için tekil üretilir; e-Fatura ekosisteminde global tekil değildir (farklı mükellefler aynı ID’yi kullanabilir). Referans için mükellefler fatura ID yerine **fatura UUID** kullanır.

### 2.1.6 Müşteri Fatura Numaraları (CustInvID)

- Fatura ID’si **platformda otomatik üretilen** GB etiketlerinde, her gönderimde yeni fatura ID üretilmesini engellemek ve **hatalı faturaları aynı ID ile yeni zarfında** tekrar gönderebilmek için **CustInvID** kullanılır; **en fazla 64 karakter** olmalıdır. Müşteri kendi sistemindeki faturaya ait belirleyici numarayı kullanmalı ve fatura ID’si otomatik olan her GB ile yapılan **her fatura gönderiminde** UBL XML’de **CustInvID bulunmalıdır**.
- CustInvID, **GB etiketi ve VKN/TCKN çifti için tekil** olmalıdır. **CustInvID ile fatura ID birebir eşlenir**; aynı CustInvID ile gönderilen faturalar her zaman aynı fatura ID’yi alır. Örnek: “A1000” ile gönderilen fatura “IN02015000000085” ID almışsa, aynı VKN/TCKN ve GB ile tekrar “A1000” CustInvID gönderildiğinde platform aynı ID’yi (“IN02015000000085”) kullanıp GİB’e iletir.
- Bu sayede hata durumunda aynı ID ile tekrar gönderim mümkün olur ve başarıyla gönderilmiş faturaların tekrar gönderimi engellenir. Zarfı henüz sonuçlanmamış veya karşı tarafta başarıyla işlenen (1200/1300) faturalara ait CustInvID’ler tekrar gönderildiğinde sistem **hata döner**.
- **UBL’de CustInvID**, fatura ID’si otomatik olan GB ile gönderilen UBL faturada **AdditionalDocumentReference** içinde iletilmelidir:

```xml
<cac:AdditionalDocumentReference>
  <cbc:ID>A1000</cbc:ID>
  <cbc:IssueDate>2015-06-22</cbc:IssueDate>
  <cbc:DocumentTypeCode>CUST_INV_ID</cbc:DocumentTypeCode>
</cac:AdditionalDocumentReference>
```

### 2.1.7 Fatura Görüntüleri ve XSLT Dosyaları

- Fatura görüntüleri, UBL-TR fatura XML’inin **AdditionalDocumentReference** ile eklenen **XSLT** belgelerinden geçirilerek **HTML** üretilmesiyle elde edilir; **PDF** görüntüler HTML’den türetilir. **getInvoiceView()** ve portaldeki HTML görüntüleri de bu yöntemle oluşturulur.
- GİB, **e-Fatura Görüntüleyici** (Java, internet gerekir) ile şema/şematron uygunluk ve imza kontrolü sunar. Bulut sistemde görüntülenemeyen veya şema/şematron/imza hatası alan faturaların UBL-TR XML’i bu programla açılıp kontrol edilebilir.
- Göndericiler, görüntünün nasıl görüneceğini belirleyen **XSLT** tasarlayıp fatura UBL XML’ine ekleyebilir; her yeni XSLT’yi bu programla **uygunluk kontrolünden geçirmelidir**. GİB standart bir e-Fatura görüntüleme XSLT’si de sunar. Görüntülenme sorununda gönderici mükellef ve sistem sorumlularıyla irtibat kurulmalıdır. Platform görüntü oluştururken başka veri kullanmaz.
- **XSLT**, UBL-TR fatura XML’inde **AdditionalDocumentReference** ile taşınır:

```xml
<cac:AdditionalDocumentReference>
  <cbc:ID>0li6ryg3xe1a2z</cbc:ID>
  <cbc:IssueDate>2015-06-22</cbc:IssueDate>
  <cbc:DocumentTypeCode>XSLT</cbc:DocumentTypeCode>
  <cbc:DocumentType>XSLT</cbc:DocumentType>
  <cac:Attachment>
    <cbc:EmbeddedDocumentBinaryObject characterSetCode="UTF-8" encodingCode="Base64"
      filename="FaturaID.xslt" mimeCode="application/xml">XSLT_BASE64</cbc:EmbeddedDocumentBinaryObject>
  </cac:Attachment>
</cac:AdditionalDocumentReference>
```

- **filename** niteliği **FaturaID.xslt** formatında olmalıdır (alıcı sistemler XSLT’yi bu nitelikle tanır). XSLT içeriği **Base64** olarak `EmbeddedDocumentBinaryObject` içinde verilir.
- **sendUBL()** ile yapılan **tüm fatura zarfı ve fatura gönderimlerinde** fatura UBL XML’ine **XSLT eklenmelidir**; aksi halde alıcı sistem ve GİB e-Fatura Görüntüleyici faturayı görüntüleyemez.

---

## 2.1.8 Zarf Durum Sorgusu ve Tekrar Gönderimi

- Karşı tarafa gönderilen zarflar, GİB veya karşı sistemde oluşan bir problem nedeniyle **hata durumuna** düşebilir ve **tekrar gönderim** gerekebilir. **Başarı/geçici kodlar:** 1200, 1210, 1220, 1300; **bunlar dışındaki** sistem yanıtı kodları (1150, 1160, 1163, 1171, 1172, 1176, 1195, 1215, 1230 vb.) hata kabul edilir.
- Her zarfın durumu **başarılı veya hatalı son statü** koduna ulaşana kadar belirli aralıklarla (ör. 4–6 saatte bir, her gece) **getEnvelopeStatus()** ile sorgulanmalı; hata alan zarflar gerekli düzeltme yapıldıktan sonra **tekrar gönderilmelidir**. **Tekrar gönderimde:** Fatura ID / CustInvID ve diğer bilgiler **aynı** kalır; **zarf UUID, fatura UUID ve uygulama yanıtı UUID’leri yeniden oluşturulmalıdır**.
- Zarf **geçici statüde** beklerken veya **başarıyla karşı tarafa iletilmiş** (1200/1300) iken aynı fatura veya aynı UY **yeni zarf ile tekrar gönderilirse sistem ilgili hata kodlarıyla gönderimi engeller**. Tekrar gönderim için önce **ilk gönderime ait zarfın son duruma ulaşıp** başarılı ya da hatalı olarak işlemini tamamlamış olması gerekir. **Gelen bir faturaya birden fazla UY** verebilmek için de her bir UY gönderiminin **son duruma ulaşmış** olması gerekir. Bu kurallar müşteri ve entegratör sistemlerinde tutarlılık için konmuştur.
- **Panel uygulaması:** `lib/taxten/taxtenClient.js` → **getInvoiceStatus** / **getEnvelopeStatus**; `UUID` = zarf UUID (EnvUUID). Gönderim API’si `POST /api/efatura/send` body’sinde `resend: true` ve isteğe bağlı `resendEnvUuid` (Taxten’e **Parameters: ["RESEND:{EnvUUID}"]**) kabul eder; tekrar gönderimde fatura için yeni UUID üretilir, CustInvID taslaktan aynı kullanılır.

---

## 2.1.9 Gönderilen Zarf, Fatura ve Uygulama Yanıtı Kontrolleri

**sendUBL()** ile gönderilen her belge aşağıdaki kontrollerden geçer. Herhangi bir aşamada başarısız olursa SOAP/REST ile fault/hata dönülür.

1. Göndericilerin Bulut e-Fatura platformuna kayıtlarının kontrolü  
2. Genel servis parametreleri ve belge alanlarının kontrolü  
3. Gönderici ve alıcıların GİB’e kayıtlarının kontrolü  
4. UBL-TR şema validasyonu  
5. UBL-TR şematron validasyonu  
6. Zarf, fatura ve uygulama yanıtı tekilliği ve durum kontrolleri  

---

## 2.1.10 Hata Yönetimi

- **sendUBL()** diğer metodlar gibi **senkron** çalışır; cevap ağ veya sunucu kesintisi nedeniyle istemciye **ulaşmayabilir**. Zarfsız gönderimlerde bu durum **zarf UUID’sinin**, fatura ID’si otomatik oluşan fatura/fatura zarfı gönderimlerinde ise **oluşan fatura ID’lerinin** istemci tarafından alınamamasına yol açar.
- Cevap alınamayan durumda (tanımlı hata kodu veya başarılı cevap gelmemişse) gönderilen belgeler sistemde **oluşmuş ya da oluşmamış** olabilir; **aynı veri tekrar gönderilirse UUID mevcut hatası** alınır. Bu belgeler istemci için **arafa düşmüş** kalır ve oluştuysa otomatik üretilen bilgiler (zarf UUID, fatura ID vb.) alınamamış olur.
- **Arafa düşen gönderimler için:** **getUBLList()** **UUID bazlı** sorgulanarak gönderilmiş faturanın zarfına veya ID’sine erişilebilir. Gönderimler kuyruklama ile toplu yapılıyorsa bu araftaki belgeler de **toplu** sorgulanıp durumları topluca güncellenebilir. Cevap alınamayan, bilgisi dönmeyen gönderimlerin durumları **mutlaka kontrol edilerek** gönderici sistemde güncellenmelidir.
- Panelde `getUBLList` ve `getUBL` Taxten client’ta mevcut; arafa düşen gönderimler için UUID ile liste çekilip yerel durum güncellenebilir.

---

## 2.1.11 IS_DRAFT Kullanımı

- **Taslak fatura** sendUBL ile gönderilmek istendiğinde **Parameters** alanına **"IS_DRAFT"** parametresi geçilmelidir. Taslak faturalar **portaldan tetiklenmediği sürece GİB’e gönderilmez.**

**IS_DRAFT istek örneği:**

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ein="http:/taxten.com/eInvoice/">
  <soapenv:Header/>
  <soapenv:Body>
    <ein:sendUBLRequest>
      <ein:VKN_TCKN>1234567801</ein:VKN_TCKN>
      <ein:DocType>INVOICE</ein:DocType>
      <ein:SenderIdentifier>urn:mail:defaultgb@taxten.com</ein:SenderIdentifier>
      <ein:ReceiverIdentifier>urn:mail:defaultpk@taxten.com</ein:ReceiverIdentifier>
      <ein:Parameters>IS_DRAFT</ein:Parameters>
      <ein:DocData>cid:1522923210449</ein:DocData>
    </ein:sendUBLRequest>
  </soapenv:Body>
</soapenv:Envelope>
```

**IS_DRAFT cevap örneği:**

```xml
<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/">
  <S:Body>
    <sendUBLResponse xmlns="http:/taxten.com/eInvoice/">
      <Response>
        <EnvUUID>3b3af8b3-14c2-44f0-82bc-4fddbc138dfc</EnvUUID>
        <UUID>2EB51A63-E3CE-53C3-8AD8-F954DE1EDF93</UUID>
        <ID>GIB2021000000000</ID>
        <CustInvID>A5000512113</CustInvID>
      </Response>
    </sendUBLResponse>
  </S:Body>
</S:Envelope>
```

---

## 2.1.12 Resend Kullanımı

- GİB’den **hata alan** ve **aynı belge UUID** ile tekrar gönderilmesi gereken belgeler için **sendUBL** metodunda **Parameters** alanında aşağıdaki formatta değer gönderilmelidir:

  **RESEND:***zarf-uuid*

  Örn. `RESEND:d6013d4d-a611-1111-a2dd-b24f79eeab59`

- **":"** solundaki kısım (**RESEND**) işlemin **yeniden gönderme** olduğunu, sağındaki kısım ise **yeniden gönderilecek zarfın zarf UUID (EnvUUID)** bilgisini belirtir.
- **Ek kurallar:** **ReceiverIdentifier** alanı gönderilmemelidir. **DocData** alanı **boş** olmalı veya **hiç gönderilmemelidir**.

**Resend istek örneği:**

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ein="http:/taxten.com/eInvoice/">
  <soapenv:Header/>
  <soapenv:Body>
    <ein:sendUBLRequest>
      <ein:VKN_TCKN>3880718497</ein:VKN_TCKN>
      <ein:SenderIdentifier>urn:mail:defaultgb@taxten.com</ein:SenderIdentifier>
      <ein:DocType>ENVELOPE</ein:DocType>
      <ein:Parameters>RESEND:c3d34939-0c52-4caa-8a1a-09e35617319b</ein:Parameters>
    </ein:sendUBLRequest>
  </soapenv:Body>
</soapenv:Envelope>
```

**Resend cevap örneği:**

```xml
<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/">
  <S:Body>
    <sendUBLResponse xmlns="http:/taxten.com/eInvoice/">
      <Response>
        <EnvUUID>b9b83521-298c-4cd5-861e-679322b64726</EnvUUID>
        <UUID>422cb341-228e-409c-8d73-129ae65b7ba9</UUID>
        <ID>EO02019000000001</ID>
        <CustInvID>d5e73807-f6bf-4220-a0c9-caa0b9df0c02</CustInvID>
      </Response>
    </sendUBLResponse>
  </S:Body>
</S:Envelope>
```

- Cevapta **EnvUUID** yeni zarf UUID’si, **UUID** hata alan fatura belgesinin UUID’si, **ID** ve **CustInvID** ilgili fatura bilgileridir.

---

## 2.2 Gelen/Gönderilen UBL Belge Listesi (getUBLList)

- **GET** `/Invoice/getUBLList`. Version=1, Identifier (GB/PK etiketi), VKN_TCKN, DocType (ENVELOPE | INVOICE | APP_RESP | SYS_RESP), Type (OUTBOUND | INBOUND), Page (varsayılan 1), PageSize (varsayılan 10).
- **UUID listesi** veya **tarih aralığı** (StartDate/EndDate) kullanılır; ikisi birlikte kullanılamaz. UUID ile tek istekte **en fazla 20** UUID. Tarih aralığında **en fazla 1 gün**; format örn. `2018-01-01T00:00:00.00+03:00`.
- **OUTBOUND:** gönderici Identifier + VKN_TCKN. **INBOUND:** alıcı Identifier + VKN_TCKN.
- **Cevap:** UUID, Identifier, VKN_TCKN, EnvType, EnvUUID, ID, CustInvID, InsertDateTime (çoklu).
- Panelde `lib/taxten/taxtenClient.js` → `getUBLList(opts)`; API route `GET /api/efatura/taxten/ubl-list` (type, docType, page, pageSize, startDate, endDate, uuid query ile).

---

## 2.3 Belge İndirme (getUBL)

- **POST** `/Invoice/getUBL`. Identifier, VKN_TCKN, UUID (çoklu, en fazla 20), DocType (ENVELOPE | INVOICE | APP_RESP | SYS_RESP), Type (OUTBOUND | INBOUND), IsZip (opsiyonel). Parameters’a "ZIP" gönderilirse cevap zipli belgeler döner (tavsiye edilir; UBL boyutları büyük olabilir).
- **Cevap:** DocData (çoklu) belge ikilik verisi.
- Panelde `getUBL(opts)`; UUID listesi getUBLList ile alınıp bu metodla indirilebilir.

---

## 2.4 VKN Belge Türüne Göre Kullanıcı Listesi (getRawUserList)

- **POST** `/Invoice/getRawUserList`. Identifier (faturanın göndericisine ait GB/PK etiketi), VKN_TCKN, Role (GB | PK), Parameters (opsiyonel).
- Gönderici VKN ve GB/PK türüne göre kayıtlı kullanıcıların bilgileri (ad, soyad, unvan vb.) ve etiket bilgileri döner. Cevap: DocData (çoklu), ParametersField (çoklu).
- Panelde `getRawUserList(opts)`.

---

## 2.5 Zarf Durum Sorgulama (getInvoiceStatus)

- **POST** `/Invoice/getInvoiceStatus`. Identifier, VKN_TCKN, UUID (çoklu, en fazla 20), Parameters (opsiyonel).
- Zarf durumu GİB’den çekilir; 4–6 saatte bir sorgu, gerekirse RESEND. Aynı zarf günde en fazla 2 kez sorgulanmalı; son statü 2 haftayı geçebilir.
- **Parameters:** "DOC_DATA" → zipli sistem yanıtı zarfı (performans tavsiye edilmez). "GTB" → ihracat faturalarında GTB referans no ve tarih.
- **Cevap (çoklu):** UUID, IssueDate, DocumentTypeCode, DocumentCode, ResponseCode, Description, DocData (opsiyonel). 1000 = işleniyor, 1100 = GİB’e gönderildi.
- Panelde `getInvoiceStatus(opts)` / `getEnvelopeStatus(opts)`; UUID listesi en fazla 20 ile sınırlı.

---

## 2.6 Fatura Görüntüsü Alma (getInvoiceView)

- **POST** `/Invoice/getInvoiceView`. UUID (Fatura ETTN), CustInvID (opsiyonel), Identifier (GB/PK), VKN_TCKN, Type (OUTBOUND | INBOUND), DocType (HTML | PDF | XSLT | HTML_DEFAULT | PDF_DEFAULT).
- Sorgu UUID veya CustInvID ile yapılır. Gönderilen için gönderici etiket + VKN_TCKN, gelen için alıcı etiket + VKN_TCKN. Varsayılan parametrelerle platform varsayılan XSLT ile görüntü oluşturulur.
- **Cevap:** DocData (doküman ikilik verisi).
- Panelde `getInvoiceView(opts)`.

---

## 2.7 Parçalı Kullanıcı Listesi (getPartialUserList)

- **POST** `/Invoice/getPartialUserList`. Identifier (opsiyonel), VKN_TCKN (opsiyonel), Role (GB | PK), IncludeBinary (opsiyonel, varsayılan true; false ile binaryData boş, sadece totalPartCount/dosya isimleri), FileNameList (opsiyonel, çoklu – belirli parça(lar) dosya adıyla).
- GİB kullanıcı listesi ~100k kullanıcılı parçalar halinde zipli (~7–8MB/parça) döner. ~1.5M kullanıcı ≈ 15 parça. IncludeBinary false ile önce bölüm sayısı ve dosya isimleri alınabilir; FileNameList ile sadece istenen parçalar çekilebilir.
- **Cevap:** totalPartCount, userCountPerPart, totalUserCount, correlationID (liste güncellenince değişir; tüm isteklerde aynı olmalı, değişirse süreç baştan), lastUpdatedAt, fileName, binaryData (base64 zipli XML).
- Panelde `getPartialUserList(opts)`.

**Mükellef sorgulama (e-Fatura / e-Arşiv / e-İrsaliye):** Bir VKN/TCKN’nin e-Fatura, e-Arşiv veya e-İrsaliye mükellefi olup olmadığı panelde şu şekilde sorgulanır:

1. **Arayüz:** **E-Fatura → Mükellef Sorgulama** sayfası (`/dashboard/efatura/mukellef-sorgu`). VKN veya TCKN girilip **Sorgula** ile sonuç alınır; **Liste Güncelle** ile GİB mükellef önbelleği senkronize edilir.
2. **API:** `POST /api/efatura/mukellef-sorgu` — body: `{ vknTckn: "10 veya 11 haneli numara" }`. Cevap: `efatura`, `earsiv`, `eirsaliye` (boolean), `unvan`, `message` (bulunamazsa).
3. **Mantık:** Önce MongoDB **gib_mukellef_cache** koleksiyonuna bakılır. Cache’te yoksa Taxten **getPartialUserList** ile son 60 günlük kayıtlar çekilir (`DocumentType: Invoice` → e-Fatura, `DespatchAdvice` → e-İrsaliye; liste içinde VKN aranır). Bulunan kayıt cache’e yazılıp döndürülür.
4. **Önbellek senkronu:** `POST /api/efatura/sync-mukellef-cache` — **getPartialUserList** ile son 90 günlük Invoice ve DespatchAdvice kullanıcı listesi alınır ve `gib_mukellef_cache` doldurulur. Böylece mükellef sorguları cache’ten hızlı yanıtlanır.

---

## 2.8 Uygulama Yanıtı Sorgulama (getInvResponses)

- **POST** `/Invoice/getInvResponses`. Identifier, VKN_TCKN, UUID (çoklu, en fazla 20 fatura ETTN), TYPE (OUTBOUND | INBOUND), Parameters (opsiyonel). Gönderici/alıcı etiket + VKN_TCKN: fatura sahibine göre.
- **Yalnızca manuel sorgu** için; zamanlanmış görevde kullanılmamalı. UY takibi getUBLList ile yapılmalı. Toplu sorgu tercih edilmeli.
- **Parameters:** "DOC_DATA" → zipli UBL (performans tavsiye edilmez).
- **Cevap:** InvoiceUUID, Fatura Yanıtı Detayları (çoklu): EnvUUID, UUID, ID, InsertDateTime, IssueDate, ARType (KABUL/RED), ARNotes, DocData.
- Panelde `getInvResponses(opts)`.

---

## 2.9 E-Arşiv: Fatura Görüntüsü Alma (GetInvoiceDocument)

- **POST** `/EArchiveInvoice/GetInvoiceDocument`

**İstek:**

| Alan | Açıklama |
|------|----------|
| VKN_TCKN | Belgenin gönderici veya alıcısına ait VKN/TCKN |
| UUID | Opsiyonel – Belge ETTN |
| InvoiceNumber | Opsiyonel – Fatura numarası |
| CustInvID | Opsiyonel – Müşteri fatura ID (fatura ID otomatikse) |

**Cevap (çoklu):** UUID, InvoiceNumber, VKN, BinaryData, Hash, Status, StatusDescription.

- Taxten **e-Arşiv Fatura** ürününe gönderilmiş e-Arşiv faturaların **PDF görüntüsü**ne ihtiyaç duyulduğunda **getInvoiceDocument()** kullanılır. Bu metot çağrıldığında e-Arşiv faturanın **105 (Fatura XSLT’si kontrol edildi)** statüsünde veya daha yüksek bir statüde olması gerekir. Bu koşulu sağlayan faturaların PDF çıktısı bu metotla talep edilebilir.
- **XSLT:** Fatura gönderilirken içine **XSLT eklenmişse** PDF bu XSLT ile üretilir ve yanıtta **BinaryData** olarak (PDF) dönülür. **XSLT içermeyen** e-Arşiv fatura için, gönderimi yapan **şube (branch)** için kayıt sırasında talep edilen **varsayılan XSLT** ile PDF üretilir.
- Panelde `lib/taxten/taxtenClient.js` → `earsivGetInvoiceDocument(opts)`; API route `pages/api/efatura/earsiv/invoice-document.js`.

---

## 2.10 E-Arşiv: İmzalı e-Arşiv Fatura XML’i Alma (GetSignedInvoice)

- **POST** `/EArchiveInvoice/GetSignedInvoice`

**İstek:**

| Alan | Açıklama |
|------|----------|
| VKN_TCKN | Belgenin gönderici veya alıcısına ait VKN/TCKN |
| UUID | Opsiyonel – Belge ETTN |
| InvoiceNumber | Opsiyonel – Fatura numarası |
| CustInvID | Opsiyonel – Müşteri fatura ID (fatura ID otomatikse) |

**Cevap:** UUID, InvoiceNumber, VKN, BinaryData, Hash, Status, StatusDescription.

- Taxten e-Arşiv Fatura ürününe gönderilmiş bir e-Arşiv faturanın **imzalandı (130)** statüsüne ulaştıktan sonra **imzalı UBL**’ine bu metotla ulaşılabilir.
- Fatura **asenkron** (**sendEnvelope()** metodu) ile gönderilmişse, e-Arşiv fatura **130** statüsüne ulaşana kadar beklenmeli, ardından imzalı UBL **getSignedInvoice()** metodu ile alınmalıdır.
- Panelde `lib/taxten/taxtenClient.js` → `earsivGetSignedInvoice(opts)`; API route `pages/api/efatura/earsiv/signed-invoice.js`.

---

## 2.11 E-Arşiv: Fatura İptali (CancelInvoice)

- **POST** `/EArchiveInvoice/CancelInvoice`

**İstek:**

| Alan | Açıklama |
|------|----------|
| VKN_TCKN | Faturanın göndericisine ait VKN/TCKN |
| InvoiceId | Opsiyonel – Fatura ID |
| CustInvID | Opsiyonel – Müşteri fatura ID (fatura ID otomatikse) |
| Branch | Şube |
| TotalAmount | Toplam tutar |
| CancelDate | İptal tarihi |

**Cevap (çoklu):** UUID (zarf ETTN), InvoiceId, Status, StatusDescription, ResponseCode, ResponseDescription.

- e-Arşiv fatura sürecinde çeşitli nedenlerle fatura **iptal** edilmek istenebilir (örn. alıcı yanlış, tutar yanlış, fatura eksik, yanlış XSLT eklenmiş). Bu durumda **cancelInvoice()** metodu kullanılır.
- İptal edilen e-Arşiv faturalar **mutlaka GİB’e raporlanmalıdır**. Mükellefin kendi ERP’sinde faturayı iptal etmesi **yeterli değildir**; hangi e-Arşiv faturaların iptal edildiği **bu metot aracılığıyla Taxten e-Arşiv Fatura ürününe bildirilmelidir**.
- Panelde `lib/taxten/taxtenClient.js` → `earsivCancelInvoice(opts)`; API route `pages/api/efatura/earsiv/cancel.js`.

---

## 2.12 E-Arşiv: Yeniden Süreç Tetikleme (RetriggerOperation)

- **POST** `/EArchiveInvoice/RetriggerOperation`

**İstek:**

| Alan | Açıklama |
|------|----------|
| VKN_TCKN | Faturanın gönderici veya alıcısına ait VKN/TCKN |
| Branch | Opsiyonel – Gelen/Gönderilen (OUTBOUND, INBOUND) |
| InvoiceId | Opsiyonel – Fatura ID |
| InvoiceUuid | Opsiyonel – Fatura ETTN |
| ParameterName | Opsiyonel – Parametre adı |
| ParameterValue | Opsiyonel – Parametre değeri |

**Cevap:** UUID, InvoiceId, Status, StatusDescription, ResponseCode, ResponseDescription.

- Taxten e-Arşiv Fatura ürününde bazı süreçler **yeniden tetiklenebilir**. Örn. e-Arşiv fatura e-posta ile alıcıya ulaşmamış (hatalı e-posta, spam vb.) veya SFTP’ye aktarılan PDF yanlışlıkla silinmiş olabilir. Bu durumlarda **retriggerOperation()** kullanılır.

**Dikkat edilecekler:**

- Yeniden tetiklenecek e-Arşiv faturanın **sistem tarafından imzalanmış** olması gerekir: **statü ≥ 130**.
- En az **UUID + VKN_TCKN** veya **e-Arşiv fatura ID + VKN_TCKN** doldurulmuş olmalıdır.
- İlgili VKN/TCKN için daha önce **SMTP veya SFTP entegrasyonu** yapılmış olmalıdır.

**Parametre örnekleri (ParameterName / ParameterValue):**

| paramName | paramValue |
|-----------|------------|
| SMTP | Mail alıcı adresi (örn. alicimailadresi@abc.com) |
| SFTP_XML | SFTP’ye taşınacak imzalı UBL dosya adı (örn. e-Arşiv fatura 123.zip) |
| SFTP_PDF | SFTP’ye taşınacak PDF görüntü dosya adı (örn. e-Arşiv fatura 123.pdf) |

- Panelde `lib/taxten/taxtenClient.js` → `earsivRetriggerOperation(opts)`.

---

## 2.13 E-Arşiv: Rapor Sorgulama (GetStatus)

- **POST** `/EArchiveInvoice/GetStatus`

**İstek:**

| Alan | Açıklama |
|------|----------|
| VKN_TCKN | VKN/TCKN bilgisi |
| BatchId | Batch ID |

**Cevap:** BatchId, StatusCode, StatusDescription, Status, StatusDetail.

- Taxten e-Arşiv Fatura ürününde **raporların durumları** takip edilebilir. **getStatus()** raporların statülerini sorgulamak için kullanılır; GİB’e gönderilmiş bir raporun gönderim aşaması veya gönderim sonrası durumu sorgulanır.
- Giriş parametreleri: **VKN_TCKN** ve **e-Arşiv Batch ID**. Bu parametrelerle istek yapıldığında ilgili VKN/TCKN’ye ait e-Arşiv **rapor durum bilgisi** dönülür.
- Panelde `lib/taxten/taxtenClient.js` → `earsivGetStatus(opts)`.

---

## 2.14 E-Arşiv: Zarf Durum Sorgulama (GetEnvelopeStatus)

- **POST** `/EArchiveInvoice/GetEnvelopeStatus`

**İstek:**

| Alan | Açıklama |
|------|----------|
| VKN_TCKN | Arşiv göndericisi/alıcısına ait VKN/TCKN |
| UUID | Çoklu – Arşiv ETTN |

**Cevap (çoklu):** UUID, Status, StatusDescription, ResponseCode, ResponseDescription.

- **E-Arşiv UBL belgesi durumunu** sorgular.
- Panelde `lib/taxten/taxtenClient.js` → `earsivGetEnvelopeStatus(opts)`; API route `pages/api/efatura/earsiv/envelope-status.js`.

---

## 2.15 E-Arşiv: Arşiv Görüntüleme (GetEArchiveView)

- **POST** `/EArchiveInvoice/GetEArchiveView`

**İstek:**

| Alan | Açıklama |
|------|----------|
| VKN_TCKN | Arşiv göndericisi/alıcısına ait VKN/TCKN |
| Details | Çoklu, opsiyonel – UUID, InvoiceNumber (opsiyonel), CustInvID (opsiyonel) |

**Cevap:** UUID, InvoiceNumber, VKN, IssueDate, Status, StatusDescription, TotalAmount, Currency, BinaryData.

- **Arşiv fatura görünümünü** getirir.
- Panelde `lib/taxten/taxtenClient.js` → `earsivGetEArchiveView(opts)`; API route `pages/api/efatura/earsiv/view.js`.

---

## 2.16 E-Arşiv: UBL Belgesi Sorgulama (GetUbl)

- **POST** `/EArchiveInvoice/GetUbl`

**İstek:**

| Alan | Açıklama |
|------|----------|
| VKN_TCKN | Arşiv göndericisi/alıcısına ait VKN/TCKN |
| Identifier | UUID, InvoiceNumber (opsiyonel), CustInvID (opsiyonel) |
| UUID | Çoklu – ETTN |
| DocType | Doküman türü |
| Type | Tip |
| IsZip | Opsiyonel – Zip’li mi (true \| false) |

**Cevap:** UUID, InvoiceNumber, VKN, IssueDate, BinaryData, Hash.

- **Belirli bir e-Arşiv UBL belgesini** getirir.
- Panelde `lib/taxten/taxtenClient.js` → `earsivGetUbl(opts)`; API route `pages/api/efatura/earsiv/ubl.js`.

---

## 3. Boyut Kısıtları ve Optimizasyon

- **Toplu gönderim:** Yüksek hacimde fatura ve uygulama yanıtları **zarflayarak** **sendUBL()** ile toplu gönderilmeli. Zip içindeki XML’in **açılmış boyutu 5MB** ile sınırlıdır; genelde **25–30 fatura-UY** zarflar bu limiti aşmadan gönderilebilir; ağ, donanım ve ortalama belge boyutuna göre optimize edilmeli.
- **getUBL():** Belgelerin **zipli toplu indirilmesi** ciddi performans sağlar. Ekli faturalar nedeniyle transfer boyutları büyüyebilir; tek çağrıda alınan UBL sayısı istemci ve ağa göre optimize edilmeli.
- **getEnvelopeStatus():** Zarf durum sorguları **mutlaka toplu**, **uzun aralıklarla**, mümkünse **sadece günlük** yapılmalı. Zamanlanmış görevler **gecelik** çalıştırılmalı; anlık ihtiyaç için **sadece sınırlı sayıda belge** için **manuel** sorgu uygundur. **Son duruma ulaşmış zarflar tekrar tekrar sorgulanmamalı.**
- **GİB kullanıcı listeleri:** Tam güncelleme **haftada bir**, **hafta sonu**; hafta içi **gece yarısından sonra** sadece **delta** (yeni kullanıcılar) alınabilir. Geçersiz VKN/TCKN ve etikete gönderim engellenir; hafta içi ihtiyaçta yeni kullanıcıların alınması yeterlidir.

---

## 4. REST API Hata Kodları ve Açıklamaları

| Kod  | Açıklama |
|------|----------|
| 1000 | Parametre Hatası |
| 1010 | Şema validasyonu hatası |
| 1020 | Şematron hatası |
| 1080 | UTF-8 validasyonu hatası |
| 1100 | Gönderici VKN/TCKN ve etiketi GİB'e kayıtlı değil |
| 1101 | Alıcı VKN/TCKN ve etiketi GİB'e kayıtlı değil |
| 1110 | Gönderici VKN/TCKN ve etiketi kayıtlı değil |
| 1111 | Alıcı VKN/TCKN ve etiketi kayıtlı değil |
| 1112 | VKN/TCKN ve etiket kayıtlı değil |
| 1200 | İstemci IP adresinin bu işleme yetkisi yok |
| 1300 | Çağrı limiti aşıldı |
| 3010 | Zarf UUID sistemde mevcut |
| 3011 | Fatura UUID sistemde mevcut |
| 3012 | Fatura ID sistemde mevcut |
| 3013 | Fatura ID otomatik üretiliyor, gönderilmemeli |
| 3014 | Fatura ID otomatik üretiliyor, müşteri fatura numarası gönderilmeli |
| 3201 | Uygulama yanıtı UUID sistemde mevcut |
| 3210 | Uygulama yanıtı verilen fatura bulunamadı |
| 3211 | Uygulama yanıtı verilen faturanın zarfı bulunamadı |
| 3215 | Fatura alıcıya ait değil |
| 3216 | Fatura göndericiye ait değil |
| 3220 | Uygulama yanıtı verilen fatura ticari fatura değil |
| 3230 | Faturaya önceki gönderilen uygulama yanıtı sonuçlanmamış |
| 3240 | Fatura geliş tarihi 8 günü geçtiği için yanıt verilemez |
| 3410 | UUID'ye ait fatura bulunmadı |
| 3420 | CustInvID'ye ait fatura bulunmadı |
| 3430 | Fatura gönderilen VKN ve etikete ait değil |
| 3440 | Fatura görüntüsü doküman türü desteklenmiyor |
| 3450 | Fatura görüntüsü oluşturulamadı |
| 3610 | UUID'ye ait belge bulunmadı |
| 3630 | UBL gönderilen VKN/TCKN ve etikete ait değil |
| 3910 | UUID'ye ait belge bulunamadı |
| 3920 | Belge gönderilen VKN/TCKN ve etikete ait değil |
| 3950 | UUID'ye ait zarf bulunamadı |
| 3960 | Zarf gönderilen VKN/TCKN ve etikete ait değil |

### E-Arşiv REST API Hata Kodları

| Kod | Açıklama |
|-----|----------|
| 5 | Zip boyutu aşıldı |
| 20 | Desteklenmeyen işlem. Zip dosyasındaki e-Arşiv fatura sayısını ve OUTPUTTYPE parametresini kontrol edin |
| 25 | Şema geçersiz |
| 30 | VKN/TCKN e-Fatura mükellefine ait |
| 35 | Data boyutu aşıldı |
| 37 | XSLT bulunamadı |
| 40 | Şematron geçersiz |
| 46 | e-Arşiv faturanın göndericisi geçersiz |
| 50 | Rapor veri alanları hatalı/eksik |
| 56 | IssueDate raporlama periyodu dışında |
| 60 | Zarf database’de mevcut |
| 65 | Rapor database’de mevcut |
| 70 | e-Arşiv fatura database’de mevcut |
| 75 | e-Arşiv fatura ID’si üretilirken hata oluştu |
| 90 | Hash doğrulanırken hata oluştu |
| 99 | Genel sistem hatası oluştu |

### E-Arşiv REST API Başarılı Yanıt Kodları

| Kod | Açıklama |
|-----|----------|
| 6 | Zip boyutu geçerlidir |
| 15 | Hash geçerlidir |
| 22 | Uyumlu çıktı (PDF) talebi |
| 26 | Şema kontrolü geçerlidir |
| 45 | Şematron kontrolü geçerlidir |
| 55 | Rapor veri alanları geçerlidir |
| 200 | OK |

---

## 5. GİB e-Fatura Sistem Yanıtı Kodları

*Ek-2 e-Fatura Uygulaması Sistem Yanıtı Şema Yapısı - v1.4* dokümanından alınmıştır. (Zarf durumu için örnek: 1000 işleniyor, 1100 GİB’e gönderildi, 1150/1160/1163/1171/1172/1176/1195/1215/1230 vb. hata, 1200/1210/1220/1300 başarı/geçici – detaylar Ek-2’de.)

---

## 6. Test Yöntemi

Entegrasyon testleri, Bulut e-Fatura platformuna kayıtlı bir VKN/TCKN’ye ait **GB ve PK etiketleri arasında** yapılabilir. Tüm metodların entegrasyon testleri tamamlandığında aşağıdaki akışla WS API entegrasyonu doğrulanır.

### 6.1 Fatura Gönderim Testi

1. Gönderici ve alıcısı test VKN/TCKN olan, **test GB → test PK** hazırlanmış, zarflanmış, **ProfileID "TICARIFATURA"** fatura **sendUBL()** ile gönderilir. Şema/şematron/validasyon hatası alınmadığı kontrol edilir; hata alınıyorsa **hata kodu ve açıklaması** kullanıcıya gösterilmelidir.
2. **getUBLList()** gönderilen fatura UUID’si ile çağrılır; zarf–fatura detayları kontrol edilir.
3. **getEnvelopeStatus()** ile zarf sorgulanır; durum **1300** olana kadar aralıklı kontrol sürdürülür. **1300** = zarf PK etiketine ulaşmış (GİB’den tekrar sisteme dönmüş, sistem yanıtı alınmış). getEnvelopeStatus yalnızca **gönderilen fatura ve uygulama yanıtı zarflarının** durumunu takip eder; gönderilen faturaya gelen uygulama yanıtları bu metotla alınamaz.

### 6.2 Fatura Alım Testi

4. **getUBLList()** test VKN/TCKN ve **PK etiketi** ile **gelen** zarflar sorgulanır; GB’den gönderilen fatura zarfının listede olduğu teyit edilir.
5. **getUBL()** ile gelen fatura zarfı indirilir; fatura detayları okunur.
6. **getInvoiceView()** ile zarf içindeki fatura UUID kullanılarak faturanın HTML görüntüsü alınır.

### 6.3 Uygulama Yanıtı Gönderim Testi

7. Test VKN/TCKN, **test PK → test GB** hazırlanmış, gelen fatura UUID’si için uygulama yanıtı zarflanıp **sendUBL()** ile gönderilir.
8. **getEnvelopeStatus()** ile zarf sorgulanır; durum **1300** olana kadar kontrol edilir. **1300** = zarf GB etiketine ulaşmış.

### 6.4 Uygulama Yanıtı Alım Testi

9. **getUBLList()** test VKN/TCKN ve **GB etiketi** ile **gelen** zarflar sorgulanır; PK’den gönderilen uygulama yanıtı zarfının listede olduğu teyit edilir.
10. **getUBL()** ile gelen uygulama yanıtı zarfı indirilir; UY detayları okunur.

**Bağımsız kontrol:** **getPartialUserList()** ile hem tam listenin hem de son bir günlük delta değişikliklerin alınabildiği ve gerekiyorsa tekil VKN/TCKN için etiket sorgulaması yapılabildiği doğrulanabilir.

---

## 7. Ekler: Bağlantı Örnekleri ve Ayarlar

### 7.1 .NET Client Bağlantı Örneği

```csharp
string url = "https://devrest.taxten.com/api/v1/Invoice/SendUbl";
string username = "your_username";
string password = "your_password";
var requestPayload = new ApiInvoiceUblRequest
{
    vkN_TCKN = "12345678901",
    senderIdentifier = "sender@example.com",
    receiverIdentifier = "receiver@example.com",
    docType = "INVOICE",
    parameters = new[] {  },
    docData = /* Zip file as binary array */
};
using var httpClient = new HttpClient();
string auth = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{username}:{password}"));
httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", auth);

string json = JsonConvert.SerializeObject(requestPayload);
var content = new StringContent(json, Encoding.UTF8, "application/json");

var response = await httpClient.PostAsync(url, content);
string responseContent = await response.Content.ReadAsStringAsync();
```

### 7.2 REST Authentication Ayarları

- **Auth Type:** Basic
- **Username / Password:** Başvuru esnasında verilen bilgiler
- **Endpoint:** REST API servis adresi
- **Request Content-Type:** `text/xml; charset=UTF-8`

---

## E-İrsaliye (Despatch) API

**Bağlantı ve ayarlar** e-Fatura ile aynıdır (Bölüm 1): URL `devrest.taxten.com` / `rest.taxten.com` api/v1, HTTPS Basic Auth, zaman aşımı önerisi 5 dakika, şema/şematron platformda, dışarıdan imzalı belge kabul edilmez.

### Despatch 2.1 Zarf, İrsaliye ve İrsaliye Yanıtı Gönderme (sendUBL)

- **POST** `/Despatch/SendUbl`

**İstek:**

| Alan | Açıklama |
|------|----------|
| VKN_TCKN | Gönderici VKN/TCKN |
| SenderIdentifier | Opsiyonel – Gönderici etiketi (yalnızca zarfsız gönderimlerde) |
| ReceiverIdentifier | Opsiyonel – Alıcı etiketi (yalnızca zarfsız gönderimlerde) |
| DocType | Belge türü: ENVELOPE, DESPATCH, RECEIPT |
| Parameters | Opsiyonel, çoklu (IS_DRAFT, RESEND:{EnvUUID}, vb.) |
| DocData | Ziplenmiş UBL XML verisi |

**Cevap (çoklu):** EnvUUID, UUID, ID, CustInvID / CustDesID (opsiyonel – irsaliye ID otomatikse müşteri irsaliye no).

- **Öneri:** Mümkün oldukça zarflı ve toplu gönderim. Zarfsızda SenderIdentifier/ReceiverIdentifier zorunludur.
- **İpucu:** Zip içindeki tek XML dosyasının adı ilgili **belge UUID** ile aynı olmalıdır.

**İstek örneği (ENVELOPE):**

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ein="http:/taxten.com/eDespatch/">
  <soapenv:Header/>
  <soapenv:Body>
    <ein:sendUBLRequest>
      <ein:VKN_TCKN>3880718497</ein:VKN_TCKN>
      <ein:DocType>ENVELOPE</ein:DocType>
      <ein:DocData>cid:1522923210449</ein:DocData>
    </ein:sendUBLRequest>
  </soapenv:Body>
</soapenv:Envelope>
```

Panelde `lib/taxten/taxtenClient.js` → `despatchSendUbl(opts)`; API route `pages/api/efatura/irsaliye/send.js`.

#### Despatch 2.1.1 Genel Bilgiler

- Bu metodla **irsaliye (DespatchAdvice)** ve **irsaliye yanıtı (ReceiptAdvice)** toplu zarflı veya tek tek zarfsız gönderilebilir. Zarfsızda **SenderIdentifier** ve **ReceiverIdentifier** gönderici/alıcı etiket bilgileriyle doldurulmalıdır.
- **DocType:** Zarf gönderiminde `ENVELOPE`, irsaliye gönderiminde `DESPATCH`, irsaliye yanıtında `RECEIPT`. Mümkün olan her durumda tekil yerine gönderici/alıcı başına **zarflı** gönderim yapılmalıdır.
- **Zip:** Sıkıştırılmış **tek UBL XML**; dosya adı gönderilen belge türüne göre **belge UUID** ile aynı olmalıdır (örn. irsaliye UUID `c674822e-cce4-48a9-a4e2-e7552aaee83a` ise zip içinde `c674822e-cce4-48a9-a4e2-e7552aaee83a.xml`).
- **Cevap:** Her oluşan belge için zarf UUID, belge UUID ve ID; otomatik ID kullanılıyorsa **CustDesID** (müşteri irsaliye numarası) dönülür.
- **UUID ve veri:** Tüm belge UUID’leri **müşteri sisteminde** oluşturulup UBL ile gönderilir. e-İrsaliye sistemi kontrollerden sonra veriyi zenginleştirmeden kaydeder ve GİB’e iletir. İstisnalar: İrsaliye ID’lerinin sistem tarafından oluşturulması ve mevcut dijital imzaların silinip entegratör mali mührü ile imzalanması.

---

## CREDITNOTE (Yolcu Beraber Fatura İptal)

- **Yolcu beraber faturasının iptaline CREDITNOTE** denir. İptal için önce iptal edilecek **zarfın GİB’deki durumu 1300** olmalıdır. GİB’de durumu 1300 olan yolcu beraber faturasını iptal etmek için **CREDITNOTE** belge türü kullanılır.
- CREDITNOTE UBL içinde **BillingReference** alanına iptal edilecek yolcu beraber faturasının bilgileri yazılmalıdır:

```xml
<cac:BillingReference>
  <cac:InvoiceDocumentReference>
    <cbc:UUID>845e56c1-32d0-451e-ac8f-f13eb35eab0f</cbc:UUID>
    <cbc:IssueDate>2018-05-28</cbc:IssueDate>
    <cbc:DocumentType>INVOICE</cbc:DocumentType>
  </cac:InvoiceDocumentReference>
  <cac:CreditNoteDocumentReference>
    <cbc:ID>A-002505</cbc:ID>
    <cbc:IssueDate>2018-05-24</cbc:IssueDate>
    <cbc:DocumentType>GIDERPUSULASI</cbc:DocumentType>
  </cac:CreditNoteDocumentReference>
</cac:BillingReference>
```

- CREDITNOTE belgesi e-Fatura **sendUBL** metodu ile gönderilir. **Zarflı** (DocType ENVELOPE) ve **zarfsız** (DocType CREDITNOTE + SenderIdentifier/ReceiverIdentifier) istek örnekleri:

**Zarflı (Envelope) istek:**

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ein="http:/taxten.com/eInvoice/">
  <soapenv:Header/>
  <soapenv:Body>
    <ein:sendUBLRequest>
      <ein:VKN_TCKN>3880718497</ein:VKN_TCKN>
      <ein:DocType>ENVELOPE</ein:DocType>
      <ein:DocData>cid:1522923210449</ein:DocData>
    </ein:sendUBLRequest>
  </soapenv:Body>
</soapenv:Envelope>
```

**Zarfsız (CreditNote) istek:**

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ein="http:/taxten.com/eInvoice/">
  <soapenv:Header/>
  <soapenv:Body>
    <ein:sendUBLRequest>
      <ein:VKN_TCKN>3880718497</ein:VKN_TCKN>
      <ein:SenderIdentifier>urn:mail:defaultgb@taxten.com</ein:SenderIdentifier>
      <ein:ReceiverIdentifier>urn:mail:yolcuberaberpk@gtb.gov.tr</ein:ReceiverIdentifier>
      <ein:DocType>CREDITNOTE</ein:DocType>
      <ein:DocData>cid:1522923210449</ein:DocData>
    </ein:sendUBLRequest>
  </soapenv:Body>
</soapenv:Envelope>
```

- CREDITNOTE zarfı **GİB’de 1300** durumuna ulaştığında yolcu beraber faturasının iptali **tamamlanmış** olur. Fatura sürecinde olduğu gibi **getEnvelopeStatus** metodu ile zarf durumu sorgulanabilir.
- Panelde `invoiceSendUbl` DocType olarak **"CREDITNOTE"** destekler; CREDITNOTE UBL üretimi ve ekranı ayrı geliştirme gerektirir (BillingReference’lı UBL + zip).

---

## Özet Tablo

| Konu | Panel / API |
|------|-------------|
| Bağlantı | Bölüm 1: devrest/rest.taxten.com/api/v1, HTTPS Basic Auth, 5 dk timeout, UBL-TR platformda kontrol |
| SendUBL | Bölüm 2.1: E-Fatura /Invoice/SendUbl, E-Arşiv /EArchiveInvoice/SendUbl; DocType ENVELOPE/INVOICE/APP_RESP; Parameters RESEND, IS_DRAFT |
| E-İrsaliye SendUBL | /Despatch/SendUbl; DocType ENVELOPE/DESPATCH/RECEIPT; irsaliye + irsaliye yanıtı; despatchSendUbl, irsaliye/send.js |
| Boyut / performans | Bölüm 3: 5MB zip limiti, 25–30 fatura-UY/zarf, getEnvelopeStatus toplu/günlük, GİB liste haftalık tam + delta |
| REST API hataları | Bölüm 4: Parametre/şema/VKN/etiket/UUID/çağrı limiti vb. kodlar ve açıklamaları |
| Entegrasyon testi | Bölüm 6: GB↔PK test akışı (fatura gönderim/alım, UY gönderim/alım, getPartialUserList) |
| REST bağlantı | Bölüm 7: Basic auth, endpoint, Content-Type; .NET örnek |
| Zarf durum sorgusu | `getInvoiceStatus(opts)` veya `getEnvelopeStatus(opts)`; `opts.UUID` = EnvUUID veya fatura UUID |
| Tekrar gönderim | `POST /api/efatura/send` → `body: { invoiceId, resend: true, resendEnvUuid?: "eski-zarf-uuid" }`; yeni UUID otomatik, CustInvID aynı |
| RESEND parametresi | `resendEnvUuid` verilirse Taxten’e `Parameters: ["RESEND:..."]` eklenir |
| Arafa düşen | getUBLList UUID ile sorgu; sonuçlarla yerel kayıt güncellenebilir |
| CREDITNOTE | DocType "CREDITNOTE" + UBL’de BillingReference; sendUBL ile gönderilir |
