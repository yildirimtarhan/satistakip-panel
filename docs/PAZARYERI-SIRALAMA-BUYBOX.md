# Pazaryeri Ürün Sıralama ve BuyBox Durumu

## Trendyol BuyBox — ✅ Var

- **Panel:** Dashboard → **Pazaryerleri** → **Trendyol BuyBox** (`/dashboard/pazaryeri/buybox`)
- **Ne yapar:** Ürünlerin maliyet + hedef kâr % ile önerilen satış fiyatını hesaplar; istenirse **Otomatik Güncelle** ile Trendyol’a fiyat/stok gönderir (buybox’ta öne çıkmak için).
- **API:** `POST /api/trendyol/buybox-monitor` (body: `items[]`, `marginPct`, `minMarginPct`, `autoUpdate`). Otomatik güncelleme için giriş yapılmış kullanıcı token’ı gerekir (API Ayarları → Trendyol bilgileri kullanılır).
- **Geçmiş:** `GET/POST /api/trendyol/buybox-history` — son 50 kayıt ve Excel dışa aktarma.

**Kullanım:** Sol menüden **Trendyol BuyBox**’a girin → Ürünler otomatik yüklenir → Hedef kâr % girin → **BuyBox Analizi Yap** → İsterseniz **Otomatik Güncelle** kutusunu işaretleyip fiyatları Trendyol’a gönderin.

---

## Hepsiburada ürün sıralama — ❌ Projede yok

- Hepsiburada tarafında **“Buybox Sıralama Sorgulama”** (satış sırası) dokümanda **opsiyonel** method olarak geçer; projede bu API çağrısı **yok**.
- Listeleme entegrasyonunda stok/fiyat güncelleme, activate/deactivate vb. için bkz. `docs/HEPSIBURADA-URUN-KATALOG.md` §8.
- Sıralama / 1. sıraya çıkma için Hepsiburada’nın ilgili API’si eklenmeden otomatik sıra yönetimi yapılamaz.

---

## N11 ürün sıralama — ❌ Projede yok

- N11’de ürün listesi ve fiyat/stok güncelleme var; **sıralama / satış sırası (1. olma)** için ayrı bir endpoint projede **tanımlı değil**.
- N11 API dokümanında ilgili “sıra” / “ranking” endpoint’i varsa, yeni bir API route ve (isteğe bağlı) panel sayfası eklenebilir.

---

## Özet

| Pazaryeri   | BuyBox / fiyat stratejisi      | Ürün sıralama (1. sıra) |
|------------|---------------------------------|---------------------------|
| **Trendyol** | ✅ BuyBox paneli + otomatik fiyat/stok | Trendyol fiyat/stok ile buybox’a etki eder |
| **Hepsiburada** | ❌ Yok (manuel liste/fiyat)      | ❌ Sıralama API’si yok |
| **N11**      | ❌ Yok                           | ❌ Sıralama API’si yok |

Trendyol BuyBox’ı kullanarak Trendyol’da fiyat ve stok güncel tutulur; bu da buybox’ta öne çıkmaya yardımcı olur. Hepsiburada ve N11’de “1. sıra” için ilgili platform API’leri projeye eklenmeden otomatik sıralama yapılamaz.
