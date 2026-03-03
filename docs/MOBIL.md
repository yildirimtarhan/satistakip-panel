# SatışTakip Mobil Sürüm

www.satistakip.online mobilde kullanım ve PWA (Progressive Web App) bilgisi.

---

## 1. Responsive (mobil uyum)

- **Viewport:** Tüm sayfalarda `width=device-width, initial-scale=1` ile mobil görünüm açılır.
- **Sidebar:** Masaüstünde solda sabit; **mobilde** varsayılan olarak gizli, **hamburger menü** (☰) ile açılır. Açıkken overlay ile kapatılabilir; bir sayfaya tıklanınca menü kendiliğinden kapanır.
- **İçerik:** Mobilde tam genişlik, padding ve dokunma alanları (touch-manipulation) artırıldı.
- **Alt boşluk:** Mobilde `pb-20` ile alt safe-area bırakıldı (ileride alt navigasyon eklenebilir).

---

## 2. PWA (Ana Ekrana Ekle)

- **manifest.json:** `public/manifest.json` — uygulama adı, tema rengi (turuncu), `display: standalone`.
- **Başlangıç:** `start_url: "/dashboard"` — “Ana ekrana ekle” sonrası doğrudan panele gider.
- **İkonlar:** Manifest’te `icon-192.png` ve `icon-512.png` tanımlı. Bu dosyalar yoksa tarayıcı varsayılan ikon kullanır. Kendi logonuzu 192x192 ve 512x512 PNG olarak `public/` altına koyabilirsiniz.

Tarayıcıda (Chrome/Safari) “Ana ekrana ekle” / “Add to Home Screen” ile uygulama telefon ana ekranına eklenir; tam ekran (standalone) açılır.

---

## 3. Kullanım

- Mobilde **giriş:** https://www.satistakip.online/auth/login — aynı sayfa mobilde de kullanılır.
- Dashboard’da sol üstteki **☰** ile menü açılır; sayfa başlığı ve Çıkış sağ üsttedir.
- Tüm mevcut sayfalar (siparişler, ürünler, cariler, raporlar vb.) mobilde de kullanılabilir; tablolar yatay kaydırılabilir.

---

## 4. Teknik özet

| Öğe | Açıklama |
|-----|----------|
| Viewport | `_app.js` içinde `next/head` ile |
| Theme / manifest | `_document.js` Head + `public/manifest.json` |
| Sidebar mobil | `DashboardLayout` state + overlay; `Sidebar` fixed, `md:` ile masaüstü davranışı |
| Hamburger | `Topbar` içinde `Menu` (lucide-react), sadece mobilde görünür |
| Safe area | `globals.css` + `viewport-fit=cover` (çentikli ekran) |

Mobil sürüm mevcut panelin responsive hâli ve PWA desteğiyle çalışır; ayrı bir native uygulama yoktur.

---

## 5. Barkod / QR kod ile ürün okuma ve ekleme (kamera)

Cep telefonu kamerası ile barkod ve QR kod okunabilir:

- **Yeni Ürün** (`/dashboard/urunler/yeni`): Barkod alanının yanındaki **📷 Tara** butonuna basın → kamera açılır → barkod/QR’ı tutun → okunan değer barkod alanına yazılır.
- **Ürünler listesi** (`/dashboard/urunler`): Arama kutusunun yanındaki **📷** butonuna basın → kamera açılır → okunan değer arama kutusuna yazılır (ürün adı, SKU veya barkod ile filtreler).

**Gereksinimler:** HTTPS, tarayıcıda kamera izni. Mobilde “Ana ekrana ekle” ile açılan PWA’da da çalışır.
