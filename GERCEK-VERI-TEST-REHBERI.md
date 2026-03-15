# Gerçek Veri ve Gerçek Fatura ile Test Rehberi

Taxten ve GİB onaylı gerçek verilerle e-fatura / e-arşiv testlerini yapmak için bu rehberi kullanın.

---

## 1. Canlı Moda Geçiş

### Firma Ayarları

1. **Ayarlar → Firma Ayarları** sayfasına gidin.
2. **Taxten Test Modu** alanını **Kapalı** (`taxtenTestMode: false`) yapın.
3. **Taxten Canlı API Bilgileri** girin:
   - Kullanıcı adı
   - Şifre
   - (Varsa) Client ID ve API Key
4. **Sender Identifier (GB Etiketi)** alanını GİB’e kayıtlı etiketinizle doldurun.
5. **Kaydet** butonuna basın.

> Test ortamında `devrest.taxten.com`, canlı ortamda `rest.taxten.com` kullanılır.

### GİB Kontrolleri

- Vergi No, Vergi Dairesi ve GB etiketi GİB sisteminde kayıtlı olmalıdır.
- E-Fatura mükellefi değilseniz e-arşiv fatura kesebilirsiniz.
- E-Fatura mükellefiyseniz e-fatura kesmeniz gerekir.

---

## 2. Gerçek Fatura ile Test Senaryoları

### E-Fatura

| Senaryo | Açıklama |
|--------|----------|
| E-Fatura Satış | Gerçek müşteri VKN ile fatura kesin |
| E-Fatura Taslak | Önce taslak oluşturun, sonra gönderin |
| Uygulama Yanıtı | Müşteri tarafından kabul/red işlemi |

### E-Arşiv

| Senaryo | Açıklama |
|--------|----------|
| E-Arşiv Satış | Bireysel müşteriye TCKN veya boş kimlik ile fatura |
| E-Arşiv İptal | Gönderilen faturayı iptal edin |
| PDF / HTML Görünüm | GİB portalında görüntüyü kontrol edin |

---

## 3. Dikkat Edilecekler

1. **Canlı modda kesilen faturalar gerçektir** – GİB’e iletilir.
2. Test için mümkünse küçük tutarlı faturalar kullanın.
3. Fatura numarası formatı firma ayarlarındaki prefix ile uyumlu olmalıdır (örn. KT2025000001).
4. Hata kodları için `TAXTEN-EFATURA-API-REFERANS.md` ve `TAXTEN-EARSIV-API-REFERANS.md` dosyalarına bakın.

---

## 4. Kontrol Listesi

- [ ] `taxtenTestMode: false` yapıldı
- [ ] Canlı Taxten kullanıcı adı / şifre girildi
- [ ] Sender Identifier (GB etiketi) GİB’e kayıtlı
- [ ] Vergi No ve Vergi Dairesi doğru
- [ ] Mükellef türüne göre e-fatura veya e-arşiv kullanılıyor

---

## 5. E-Fatura Kontör Takibi

### Kullanıcılar

- **Panel:** E-Dönüşüm → E-Fatura Kontör sayfasından kullanılan / limit / kalan kontör bilgisini görebilir.
- **Firma Ayarları:** Kontör limiti (opsiyonel) girilir. Boş bırakılırsa sınırsız kabul edilir.

### ERP Entegrasyonu

ERP veya harici sistemler fatura kestiklerinde:

1. **Gönderim:** `POST /api/efatura/send` ile fatura gönderilir. Her başarılı gönderimde 1 kontör düşer.
2. **Kontör sorgusu:** `GET /api/efatura/kontor` + Bearer token ile anlık kontör bilgisi alınır.
3. **Limit aşımı:** Limit tanımlı ve kalan 0 ise gönderim 402 hatası ile reddedilir.

Yanıt örneği:
```json
{
  "used": 150,
  "limit": 1000,
  "remaining": 850,
  "hasLimit": true
}
```
