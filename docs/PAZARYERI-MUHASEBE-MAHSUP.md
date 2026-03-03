# Pazaryeri Muhasebe ve Mahsup (Hepsiburada, N11, Trendyol)

Pazaryerlerinden gelen ödemelerin muhasebe ve cari hesaplarla nasıl mahsup edileceği.

---

## 1. Mantık (özet)

- **Satış:** Müşteri siparişi → Cari (müşteri) **borçlanır** (satış fişi). Aynı sipariş için **pazaryeri** de size borçludur (parayı o sizden kesip sonra toplu ödeme yapar).
- **Pazaryeri Cari:** Her platform için bir **cari hesap** (Hepsiburada, N11, Trendyol) açılır. Bu cari:
  - **Borç** = Platformun size olan borcu (yaptığınız satışların toplamı, komisyon sonrası ödeyeceği tutar).
  - **Alacak** = Platformun size yaptığı ödemeler (havale/EFT).
- **Mahsup:** Platform ödeme yaptığında **tahsilat** (alacak) bu pazaryeri carisine işlenir; bakiye = borç − alacak = platformun hâlâ size borcu (veya sıfır).

---

## 2. Sistemdeki akış

### 2.1 Satışlar

- **Hepsiburada:** "ERP'ye aktar" ile sipariş → **müşteri carisi** (alıcı) + **satış** (borç) oluşur. Aynı anda **Hepsiburada** carisine **pazaryeri borcu** (borç) yazılır; böylece Hepsiburada’nın size borcu takip edilir.
- **N11 / Trendyol:** Benzer şekilde sipariş → müşteri carisi + satış. İleride N11/Trendyol için de “pazaryeri carisi + borç” eklenebilir.

### 2.2 Pazaryeri ödemesi (tahsilat = mahsup)

1. **Cariler** veya **Cari / Tahsilat** ekranına gidin.
2. Cari olarak **Hepsiburada** (veya N11, Trendyol) seçin.
3. **Tahsilat** girin: Tutar = platformdan gelen net ödeme (komisyon/kargo düşülmüş).
4. Kaydedin: Bu işlem pazaryeri carisine **alacak** yazar; bakiye düşer (mahsup).

Böylece:

- **Hepsiburada cari bakiye** = Toplam pazaryeri borcu − Yapılan tahsilatlar = Platformun size kalan borcu (veya ödedikten sonra 0).

---

## 3. Komisyon ve kargo

- Platform **komisyon** ve **kargo** tutarını ödemeden düşer; sizin elinize **net ödeme** geçer.
- Mahsup için **net ödemeyi** tahsilat olarak girin. Komisyon/kargo ayrıca gider olarak takip edilecekse:
  - Ya **gider** (ödeme) fişi açarsınız (komisyon carisi veya genel gider),
  - Ya da raporlarda **pazaryeri satış raporu** (ciro, komisyon, net) ile kontrol edersiniz.

---

## 4. Adım adım (Hepsiburada örneği)

| Adım | Ne yapılır |
|------|-------------|
| 1 | HB siparişleri "ERP'ye aktar" ile aktarılır → Müşteri carisi + satış + **Hepsiburada carisine borç** oluşur. |
| 2 | Cariler listesinde **Hepsiburada** carisini açın; bakiyesi = size borcu (satışlar toplamı). |
| 3 | Hepsiburada hesap özetinden **dönem net ödemesini** (komisyon/kargo düşülmüş) not alın. |
| 4 | **Cari Tahsilat** ekranında Cari = Hepsiburada, Tutar = net ödeme, Açıklama = "Hepsiburada Şubat ödemesi" → Kaydet. |
| 5 | Hepsiburada carisi bakiyesi düşer; bakiye 0’a yakınsa o dönem mahsup tamamlanmış olur. |

---

## 5. N11 / Trendyol

- **N11:** Sipariş aktarıldığında (tekli aktar veya senkronize et) **N11** carisi otomatik oluşur ve **pazaryeri borcu** yazılır. Platform ödemesini **Cari Tahsilat** ile N11 carisine alacak girin; bakiye = mahsup durumu.
- **Trendyol:** Panelde sipariş aktarımı yok; **Trendyol** carisi otomatik oluşmaz. Muhasebe için: `POST /api/pazaryeri/ensure-caris` (JWT) ile N11 ve Trendyol carilerini oluşturun; Trendyol ödemelerini **Cari Tahsilat** ile Trendyol carisinden işleyin.
 ERP’
## 6. İptal ve iade

- **Hepsiburada:** Sipariş iptal webhook'u (CancelOrderLine / OrderCancelled) geldiğinde ERP'de satış iptali oluşturulur ve **Hepsiburada** carisindeki ilgili **pazaryeri borcu** otomatik geri alınır (alacak = pazaryeri_borc_iptal, bakiye düşer).
- **Panelden iptal:** Satış İade/İptal ekranından bir satış iptal edildiğinde, satış no **HB-** veya **N11-** ile başlıyorsa ilgili pazaryeri carisinde borç otomatik geri alınır.
- **İade:** İade fişi ayrı bir akıştır; gerekirse aynı mantıkla pazaryeri borcu geri alınacak şekilde genişletilebilir.

---

## 7. Raporlar

- **Pazaryeri satış raporu:** Platform bazlı ciro, komisyon, net (varsa).
- **Cari özet:** Pazaryeri carilerinin bakiyeleri = henüz tahsil edilmeyen platform borçları.

Bu yapı ile pazaryeri muhasebe ve hesaplar tek yerden (cari + tahsilat) mahsup edilir.

---

## 8. Pazaryeri API referansları (kontrol için)

- **Hepsiburada:** [developers.hepsiburada.com](https://developers.hepsiburada.com) — Sipariş Webhook Modeli, İptal (Order Cancel), İptal Edilmiş Siparişler Listesi, İade/Recall (deliveryReturn) dokümanları.
- **N11:** Resmi N11 API/SOAP dokümantasyonu ve satıcı paneli — iptal/iade endpoint’leri için platform dokümanı veya destek kanalı kullanılabilir.
- **Trendyol:** Trendyol Satıcı API dokümantasyonu — sipariş ve iptal/iade servisleri için resmi geliştirici sayfasına bakın.
