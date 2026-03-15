# Taxten'e Sorulacak Sorular

E-Fatura / E-Arşiv / E-İrsaliye entegrasyonu ve destek süreçlerinde Taxten'e iletebileceğiniz soru listesi.

---

## 1. API ve Teknik

1. **Request/Response formatı**  
   - Request body alanları tam olarak hangi formatta (camelCase / PascalCase)? Resmi örnek request/response paylaşılabilir mi?
   - Response yapısı (başarı/hata) sabit mi, versiyonlara göre değişir mi?

2. **Hata kodları ve mesajlar**  
   - Tüm hata kodları ve Türkçe/açıklayıcı mesaj listesi var mı? (Örn. 401, 403, 4xx, 5xx için anlamları.)
   - Zarf/fatura durum kodları (kabul, ret, iade vb.) için resmi açıklama dokümanı mevcut mu?

3. **Zaman aşımı ve limitler**  
   - Önerilen request timeout süresi (saniye)?
   - Rate limit / dakikada veya günde maksimum istek sayısı var mı?
   - Gönderim (SendUbl) için tek seferde maksimum belge sayısı sınırı var mı?

4. **Test ve canlı ortam**  
   - Test (`devrest.taxten.com`) ile canlı (`rest.taxten.com`) arasında bilinen farklar nelerdir?
   - Test ortamında kontör / kullanım limiti nasıl işliyor?

---

## 2. Kimlik Doğrulama ve Hesap

5. **Client ID + API Key vs Kullanıcı adı/Şifre**  
   - Hangi yöntem önerilir (x-client-id + x-api-key mi, Basic Auth mı)?
   - İkisi aynı hesapta birlikte kullanılabilir mi?

6. **Çoklu firma (multi-tenant)**  
   - Her müşteri (firma) için ayrı Taxten hesabı/Client ID açılması mı gerekiyor?
   - Tek entegratör hesabı altında birden fazla VKN/vergi no ile işlem yapma imkânı var mı?

7. **Branch / Şube**  
   - E-Arşiv ve E-İrsaliye’de `Branch` alanı zorunlu mu? Varsayılan değer ne olmalı?
   - Şube bazlı raporlama veya limit ayrımı API üzerinden yapılabiliyor mu?

---

## 3. E-Fatura

8. **Taslak ve yeniden gönderim**  
   - Taslak (IS_DRAFT) gönderiminde sonradan “kesinleştir” akışı nasıl? Aynı EnvUUID ile mi?
   - RESEND ile yeniden gönderimde dikkat edilmesi gereken kurallar neler?

9. **getUBLList / getUBL**  
   - Tarih aralığı veya sayfalama parametreleri neler? Maksimum kayıt sayısı?
   - Gelen (incoming) faturalar da bu listeye dâhil mi, ayrı endpoint var mı?

10. **getInvoiceStatus / getInvoiceView**  
    - Zarf durumları (kabul edildi, reddedildi, beklemede vb.) için kod listesi nerede?
    - PDF/HTML görüntüleme (getInvoiceView) hangi formatları destekliyor?

---

## 4. E-Arşiv

11. **OutputType ve çıktı formatları**  
    - `OutputType` (PDF, HTML vb.) için desteklenen tüm değerler neler?
    - E-Arşiv iptal sonrası durum sorgulama (GetEnvelopeStatus / CancelInvoice) response örnekleri paylaşılabilir mi?

12. **Kontör ve kullanım**  
    - Kontör bakiyesi hangi endpoint ile alınıyor? (getCreditBalance veya eşdeğeri.)
    - Kontör bitince API davranışı: 402, 429 veya özel hata kodu var mı?

13. **Panelde yüklenen fatura şablonları (XSLT / köntör)**  
    - Taxten panelinde yüklenen fatura görünüm şablonları (XSLT) API ile listelenebilir / indirilebilir mi? ERP entegrasyonunda bu şablonların kullanılması için resmi endpoint var mı?
    - Panelde “yüklenen kontör” (satın alınan fatura adedi) bilgisi hangi API ile tam olarak senkronize edilebilir?

---

## 5. E-İrsaliye

14. **Despatch SendUbl**  
    - `POST /Despatch/SendUbl` için zorunlu alanlar ve örnek request body var mı?
    - DocType: DESPATCH ve RECEIPT ayrımı nasıl yapılıyor? İrsaliye tipi (sevk/tesellüm) nasıl belirtiliyor?

15. **SenderIdentifier**  
    - E-İrsaliye’de gönderici tanımlayıcı (urn:mail:..., VKN vb.) formatı ve GİB kuralları neler?

---

## 6. Mükellef ve Liste Erişimi

16. **getPartialUserList / GetUserList**  
    - Mükellef listesi (GİB önbelleği) hangi endpoint ile alınıyor? Bu özellik tüm hesaplarda açık mı?
    - Erişim 401/403 alıyorsa: hangi yetki veya sözleşme gerekli? (Destek tarafında “getPartialUserList erişimini açın” talebi yeterli mi?)

16. **Güncelleme sıklığı**  
    - Mükellef listesi ne sıklıkla güncellenir? Cache süresi önerisi var mı?

---

## 7. Destek ve Dokümantasyon

18. **Güncel dokümanlar**  
    - E-Fatura, E-Arşiv, E-İrsaliye için güncel REST API kılavuzu (PDF/v1.x) nereden indirilir?
    - Değişiklik (changelog) veya versiyon notları yayımlanıyor mu?

19. **Destek kanalları**  
    - Teknik entegrasyon sorunları için e-posta, portal veya ticket süreci nedir?
    - Acil (canlı ortam kesintisi) için ayrı bir iletişim yolu var mı?

---

## Kullanım notu

- Bu listeyi e-posta veya destek talebine ekleyebilirsiniz.
- Cevapları aynı dosyada veya `docs/TAXTEN-API-KONTROL.md` / `GIB-TAXTEN-KONTROL-LISTESI.md` ile birlikte güncelleyebilirsiniz.
