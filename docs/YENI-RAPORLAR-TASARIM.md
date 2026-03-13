# Yeni Raporlar Tasarım Dokümanı

Bu dokümanda Raporlar bölümüne eklenecek **3 yeni rapor** için ekran tasarımı, veri modeli ve API taslağı yer almaktadır.

---

## Mevcut Raporlar Menüsü (Özet)

| Rapor | Route | Açıklama |
|-------|-------|----------|
| Özet Dashboard | `/dashboard/raporlar/ozet` | KPI özeti |
| Satış Analizi | `/dashboard/raporlar/satis-analizi` | Satış ve gelir |
| Stok Analizi | `/dashboard/raporlar/stok-analizi` | Stok hareketleri |
| Kar / Zarar | `/dashboard/raporlar/kar-zarar` | Gelir-gider, pazaryeri karlılığı |
| Pazaryeri Raporu | `/dashboard/raporlar/pazaryeri-satis` | Platform bazlı satış |
| Ürün Performansı | `/dashboard/raporlar/urun-performansi` | En çok satan ürünler |
| Cari Özet | `/dashboard/raporlar/cari-ozet` | Cari bazlı ciro ve bakiye |

**Yeni eklenecekler:** Sipariş Kâr/Zarar, İade & Kargo Analizi, Kategori Performansı

---

## 1. Sipariş Bazlı Net Kâr/Zarar Raporu

### Amaç
Her siparişte: satış tutarı, maliyet, komisyon, kargo → **net kâr/zarar** hesaplanır. Sipariş detayına inilebilir.

### Veri Kaynağı
- **Transaction** (islemTuru: satis) — mevcut Kar/Zarar ile uyumlu
- Gerekirse **N11Order**, **Hepsiburada/Trendyol** sipariş entegrasyonlarından ek alanlar

### Veri Modeli (Özet)

| Alan | Tip | Açıklama |
|------|-----|----------|
| saleNo | string | Sipariş / satış no |
| tarih | date | İşlem tarihi |
| pazaryeri | string | Trendyol, N11, Hepsiburada, Mağaza |
| brutSatis | number | Brüt satış tutarı |
| toplamMaliyet | number | Ürün maliyeti |
| komisyonTutari | number | Pazaryeri komisyonu |
| kargoTutari | number | Kargo maliyeti |
| iadeTutari | number | İade varsa tutar |
| netKar | number | brutSatis - maliyet - komisyon - kargo - iade |
| karMarji | number | (netKar / brutSatis) * 100 |
| durum | string | active, iade, iptal |

### Ekran Tasarımı

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Sipariş Kâr/Zarar Raporu                                                    │
│  Sipariş bazlı net kâr ve zarar detayı                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Başlangıç Tarihi] [Bitiş Tarihi] [Pazaryeri ▼] [Filtrele] [Excel İndir]   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Özet Kartlar:                                                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │ Toplam      │ │ Ort. Kar    │ │ Kar Marjı   │ │ Zarar       │            │
│  │ Sipariş     │ │ Marjı %     │ │ Ort. %      │ │ Sipariş     │            │
│  │ 156         │ │ ₺127       │ │ 18.2        │ │ 12          │            │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘            │
├─────────────────────────────────────────────────────────────────────────────┤
│  Detay Tablo:                                                                │
│  ┌──────────┬──────────┬────────────┬────────┬─────────┬────────┬────────┐  │
│  │ Sipariş  │ Tarih    │ Pazaryeri  │ Brüt   │ Maliyet │ Net    │ Durum  │  │
│  │ No       │          │            │ Satış  │+K+Kargo │ Kar    │        │  │
│  ├──────────┼──────────┼────────────┼────────┼─────────┼────────┼────────┤  │
│  │ N11-1234 │ 10.03.25 │ N11        │ 1.450  │ 1.120   │ 330    │ ✓      │  │
│  │ HB-5678  │ 10.03.25 │ Hepsiburada│ 2.100  │ 1.890   │ -50    │ ⚠ Zarar│  │
│  │ TY-9012  │ 09.03.25 │ Trendyol   │ 890    │ 650     │ 180    │ ✓      │  │
│  └──────────┴──────────┴────────────┴────────┴─────────┴────────┴────────┘  │
│  [◀ Önceki] Sayfa 1 / 8 [Sonraki ▶]                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### API Önerisi

- **Endpoint:** `GET /api/reports/order-profit-loss`
- **Query:** `startDate`, `endDate`, `marketplace`, `page`, `limit`
- **Response:** `{ success, summary: {...}, orders: [...], pagination }`

### Sidebar Eklemeleri

```js
{ title: "Sipariş Kâr/Zarar", href: "/dashboard/raporlar/siparis-kar-zarar", icon: FileText, description: "Sipariş bazlı net kâr ve zarar" }
```

---

## 2. İade ve Kargo Maliyeti Analizi

### Amaç
İade ve kargo maliyetlerini ayrı göstererek pazaryeri bazlı zararları tespit eder.

### Veri Kaynağı
- **Transaction** (durum: iade, veya iade/iptal fişleri)
- **Transaction** (kargoTutari) — satış fişlerindeki kargo gideri

### Veri Modeli (Özet)

| Alan | Açıklama |
|------|----------|
| iadeToplam | Toplam iade tutarı |
| iadeAdet | İade sayısı |
| kargoToplam | Toplam kargo maliyeti |
| kargoAdet | Kargolu sipariş sayısı |
| pazaryeriBazli | Pazaryerine göre iade + kargo breakdown |

### Ekran Tasarımı

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  İade & Kargo Maliyet Analizi                                                │
│  İade ve kargo kaynaklı zararların detaylı analizi                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Başlangıç] [Bitiş] [Pazaryeri ▼] [Filtrele] [Excel İndir]                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  Özet:                                                                       │
│  ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐    │
│  │ Toplam İade         │ │ Toplam Kargo        │ │ Toplam Zarar        │    │
│  │ ₺12.450             │ │ ₺8.320              │ │ ₺20.770             │    │
│  │ 47 adet             │ │ 312 sipariş         │ │ İade + Kargo        │    │
│  └─────────────────────┘ └─────────────────────┘ └─────────────────────┘    │
├─────────────────────────────────────────────────────────────────────────────┤
│  Pazaryeri Dağılımı:                                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Pazaryeri    │ İade Tutarı │ İade Adet │ Kargo Tutarı │ Kargo Adet    │  │
│  ├──────────────┼─────────────┼───────────┼──────────────┼───────────────┤  │
│  │ Trendyol     │ 5.200       │ 18        │ 3.100        │ 120           │  │
│  │ N11          │ 4.100       │ 15        │ 2.800        │ 98            │  │
│  │ Hepsiburada  │ 3.150       │ 14        │ 2.420        │ 94            │  │
│  └──────────────┴─────────────┴───────────┴──────────────┴───────────────┘  │
│                                                                              │
│  [Grafik: Bar Chart - Pazaryeri bazlı İade vs Kargo]                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### API Önerisi

- **Endpoint:** `GET /api/reports/return-cargo-analysis`
- **Query:** `startDate`, `endDate`, `marketplace`
- **Response:** `{ success, summary: { iadeToplam, iadeAdet, kargoToplam, kargoAdet }, byMarketplace: [...] }`

### Sidebar Eklemeleri

```js
{ title: "İade & Kargo Analizi", href: "/dashboard/raporlar/iade-kargo-analizi", icon: Truck, description: "İade ve kargo maliyeti detayı" }
```

---

## 3. Kategori Bazlı Satış ve Kâr Raporu

### Amaç
Ürün kategorisine göre satış, gelir ve kâr karşılaştırması yapar.

### Veri Kaynağı
- **Product** → `category` (metin veya kategori adı)
- **Transaction** (satış) + items → Product ile join → Product.category
- Veya Transaction/Order kayıtlarında `kategori` / `categoryName` tutuluyorsa direkt kullanılır

### Veri Modeli (Özet)

| Alan | Açıklama |
|------|----------|
| kategori | Kategori adı |
| siparisSayisi | Sipariş adedi |
| brütSatis | Brüt satış tutarı |
| maliyet | Toplam maliyet |
| komisyon | Toplam komisyon |
| kargo | Toplam kargo |
| netKar | netKar |
| karMarji | (netKar / brütSatis) * 100 |
| urunSayisi | Bu kategorideki ürün sayısı |

### Ekran Tasarımı

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Kategori Performans Raporu                                                  │
│  Kategori bazlı satış, gelir ve kârlılık analizi                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Başlangıç] [Bitiş] [Pazaryeri ▼] [Sırala: Net Kâr ▼] [Excel İndir]        │
├─────────────────────────────────────────────────────────────────────────────┤
│  Özet:                                                                       │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐                 │
│  │ Kategori Sayısı │ │ En Karlı Kategori│ │ Toplam Net Kâr  │                 │
│  │ 12              │ │ Elektronik      │ │ ₺45.230         │                 │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  Kategori Detay Tablo:                                                       │
│  ┌────────────────┬──────────┬──────────┬──────────┬──────────┬──────────┐   │
│  │ Kategori       │ Sipariş  │ Brüt     │ Maliyet  │ Net Kâr  │ Kar Marjı│   │
│  ├────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┤   │
│  │ Elektronik     │ 145      │ 89.200   │ 62.100   │ 18.400   │ 20.6%    │   │
│  │ Giyim          │ 203      │ 52.100   │ 38.200   │ 9.100    │ 17.5%    │   │
│  │ Ev & Yaşam     │ 87       │ 34.500   │ 25.100   │ 6.200    │ 18.0%    │   │
│  │ Kategorisiz    │ 12       │ 2.400    │ 2.100    │ 100      │ 4.2%     │   │
│  └────────────────┴──────────┴──────────┴──────────┴──────────┴──────────┘   │
│                                                                              │
│  [Grafik: Bar Chart - Kategori bazlı Net Kâr / Brüt Satış]                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### API Önerisi

- **Endpoint:** `GET /api/reports/category-performance`
- **Query:** `startDate`, `endDate`, `marketplace`, `sortBy` (netKar, brütSatis, karMarji)
- **Response:** `{ success, summary, categories: [...], chartData }`

### Sidebar Eklemeleri

```js
{ title: "Kategori Performansı", href: "/dashboard/raporlar/kategori-performansi", icon: FolderOpen, description: "Kategori bazlı satış ve kâr" }
```

---

## Uygulama Sırası Önerisi

| Sıra | Rapor | Zorluk | Veri Hazırlığı |
|------|-------|--------|-----------------|
| 1 | Sipariş Kâr/Zarar | Orta | Transaction’da `saleNo`, `pazaryeri`, `toplamMaliyet`, `komisyonTutari`, `kargoTutari` gerekli |
| 2 | İade & Kargo Analizi | Orta | İade fişleri + kargo alanları mevcut yapıda kullanılıyor |
| 3 | Kategori Performansı | Orta | Product.category + Transaction items → productId join |

---

## Transaction Modeli Notu

`profit-loss` ve `sales-analysis` API’leri şu alanları kullanıyor:
- `islemTuru` (satis / alis)
- `tarih` veya `date`
- `toplamTutar` veya `totalTRY`
- `toplamMaliyet`, `komisyonTutari`, `kargoTutari`
- `pazaryeri`
- `durum` (iade için)

Transaction şemasında bu alanlar tanımlı değilse, **sipariş/satış aktarımı** sırasında bu alanların doldurulduğundan emin olunmalı. Gerekirse Transaction modeline bu alanlar eklenir.

---

## Sidebar Güncelleme (Tam Liste)

```javascript
const raporMenuItems = [
  {
    title: "Raporlar",
    icon: BarChart3,
    submenu: [
      { title: "Özet Dashboard", href: "/dashboard/raporlar/ozet", ... },
      { title: "Satış Analizi", href: "/dashboard/raporlar/satis-analizi", ... },
      { title: "Stok Analizi", href: "/dashboard/raporlar/stok-analizi", ... },
      { title: "Kar / Zarar", href: "/dashboard/raporlar/kar-zarar", ... },
      { title: "Sipariş Kâr/Zarar", href: "/dashboard/raporlar/siparis-kar-zarar", icon: FileText, description: "Sipariş bazlı net kâr ve zarar" },
      { title: "İade & Kargo Analizi", href: "/dashboard/raporlar/iade-kargo-analizi", icon: Truck, description: "İade ve kargo maliyeti detayı" },
      { title: "Kategori Performansı", href: "/dashboard/raporlar/kategori-performansi", icon: FolderOpen, description: "Kategori bazlı satış ve kâr" },
      { title: "Pazaryeri Raporu", href: "/dashboard/raporlar/pazaryeri-satis", ... },
      { title: "Ürün Performansı", href: "/dashboard/raporlar/urun-performansi", ... },
      { title: "Cari Özet", href: "/dashboard/raporlar/cari-ozet", ... },
    ],
  },
];
```
