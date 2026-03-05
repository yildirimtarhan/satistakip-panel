# Her Firma E-Fatura Sistemini Nasıl Kullanır?

Bu dokümanda SatışTakip ERP’de **her firmanın e-fatura / e-arşiv** erişiminin nasıl çalıştığı özetlenir.

---

## Kısa cevap

**Her firma kendi Taxten API bilgilerini kullanır.** Sizin verdiğiniz tek bir ortak API/şifre ile tüm faturalar değil; başvuru onayı sonrası **o firmaya özel** üretilen Client ID ve API Key (veya kullanıcı adı/şifre) kullanılır.

---

## Akış

### 1. Başvuru

- Firma, panelden **E-Fatura Başvurusu** yapar (firma bilgileri, iletişim, logo/imza vb.).
- Kayıt `efatura_applications` ve firma ayarlarına işlenir.

### 2. Onay

- **Admin** başvuruyu onaylar.
- Onay sırasında **Taxten API** ile o firmaya ait hesap oluşturulur; Taxten’dan dönen **Client ID** ve **API Key** (veya kullanıcı adı/şifre) alınır.
- Bu bilgiler **o firmanın** `company_settings` kaydına yazılır:
  - `efatura.taxtenClientId`
  - `efatura.taxtenApiKey`
  - (İsteğe bağlı / alternatif) `taxtenUsername`, `taxtenPassword`

Yani API/şifre **firma bazında** saklanır; her firma kendi Taxten kimliğini kullanır.

### 3. Fatura gönderimi

- Kullanıcı panelden fatura göndermek istediğinde istek **giriş yapan kullanıcının token’ı** ile yapılır.
- Sistem, bu kullanıcının **firmasını** (userId / companyId) bulur.
- **Sadece o firmaya ait** `company_settings` kaydı okunur.
- Taxten’a gönderimde:
  - Varsa **o firmanın** `efatura.taxtenClientId` + `efatura.taxtenApiKey` kullanılır,
  - Yoksa **o firmanın** `taxtenUsername` + `taxtenPassword` (Basic Auth) kullanılır.

Sonuç: **Her firma e-fatura sistemini kendi API/şifre bilgileriyle kullanır;** başka bir firmanın Taxten bilgisi kullanılmaz.

---

## İki olası model

### A) Firma başına Taxten hesabı (mevcut tasarım)

- Her firma için Taxten tarafında ayrı hesap açılır (onay anında).
- Dönen Client ID + API Key (veya kullanıcı adı/şifre) sadece o firmanın `company_settings` kaydına yazılır.
- Fatura gönderirken her zaman **giriş yapan kullanıcının firmasına ait** kayıt kullanılır.
- **Sonuç:** Her firma kendi e-fatura hesabını kullanır; sizin tek bir “ortak API/şifre” vermeniz gerekmez.

### B) Tek Taxten hesabı (sizin verdiğiniz API/şifre)

- Tüm faturalar **sizin** tek Taxten hesabınızdan gönderilir.
- Bu durumda:
  - Tek bir `company_settings` kaydında (ör. `userId: "global"` veya tek bir firma) `taxtenUsername` ve `taxtenPassword` (veya Client ID/API Key) tanımlanır.
  - Fatura gönderirken bu tek kayıt kullanılır; gönderen VKN ise her faturada ilgili **müşteri firmasına** göre set edilir.
- Bu model şu an varsayılan değildir; istenirse `send.js` ve firma eşlemesi buna göre uyarlanabilir.

---

## Teknik özet

| Konu | Açıklama |
|------|----------|
| Kimlik bilgisi nerede? | Her firma için `company_settings` içinde (o firmaya ait kayıt). |
| Hangi alanlar? | `efatura.taxtenClientId`, `efatura.taxtenApiKey` veya `taxtenUsername`, `taxtenPassword`. |
| Fatura gönderirken | JWT’den userId/companyId alınır; sadece o firmaya ait `company_settings` kullanılır. |
| VKN/TCKN | Gönderen: `company.vergiNo` (veya vkn / vknTckn); alıcı: taslaktaki müşteri bilgisi. |

---

## Sık sorulan soru

**“Verdiğimiz API ve şifrelerle mi kullanacak?”**  
- **Hayır (mevcut tasarım):** Sizin tek bir API/şifre vermeniz gerekmez. Her firma, başvurusu onaylandığında Taxten’dan **kendisine atanan** Client ID ve API Key (veya kullanıcı adı/şifre) ile kullanır.  
- **Evet (alternatif):** Tek Taxten hesabı kullanmak isterseniz, sizin verdiğiniz API/şifre tek bir firma/global kayda konur ve tüm gönderimler o hesaptan yapılır; bu durumda kod buna göre ayarlanmalıdır.
