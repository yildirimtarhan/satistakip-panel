# Trendyol Test (Stage) Ortamı

Test ortamı için ortak test hesabını kullanabilir veya kendi test hesabınızı oluşturabilirsiniz.

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

- API ayarlarını kaydettikten sonra **Trendyol bağlantı testi** butonu ile `/api/trendyol/test-connection` çağrılır.
- Başarılı olursa sipariş listesi ve diğer Trendyol sayfaları stage API ile çalışır.
- Test ortamında bağlantı başarısız veya “HTML yanıt” alıyorsanız büyük olasılıkla **IP kısıtlaması** vardır; yukarıdaki “IP kısıtlaması” bölümüne bakın.
- **401 / Yetki hatası** alıyorsanız yukarıdaki “401 Unauthorized” bölümüne bakın.

## Entegrasyon dokümanı

- https://developers.trendyol.com

## Özet

1. Stage panele giriş yapın (yukarıdaki e-posta/şifre veya kendi hesabınız).
2. **Hesap Bilgilerim**’den API Key ve API Secret alın.
3. `.env` veya Render’da `TRENDYOL_SUPPLIER_ID`, `TRENDYOL_API_KEY`, `TRENDYOL_API_SECRET`, `TRENDYOL_BASE_URL`, `TRENDYOL_USER_AGENT` tanımlayın (stage için `TRENDYOL_BASE_URL` yukarıdaki gibi).
4. Panelde **API Ayarları → Trendyol**’da da aynı bilgileri girebilirsiniz.
5. Bağlantı testi ile kontrol edin.
