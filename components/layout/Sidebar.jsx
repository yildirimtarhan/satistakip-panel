// 📁 /components/layout/Sidebar.jsx
import Link from "next/link";
import { useRouter } from "next/router";
import { jwtDecode } from "jwt-decode"; // ✅ doğru import

const MenuItem = ({ href, icon, label }) => {
  const router = useRouter();
  const active = router.pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-xl transition
        ${active ? "bg-orange-100 text-orange-700" : "text-slate-700 hover:bg-slate-100"}`}
    >
      <span className="text-lg">{icon}</span>
      <span className="font-medium">{label}</span>
    </Link>
  );
};

export default function Sidebar() {
  const router = useRouter();

  let role = null;
  try {
    const token = localStorage.getItem("token");
    if (token) {
      const decoded = jwtDecode(token);
      role = decoded.role;
    }
  } catch (err) {
    console.error("Sidebar decode hatası:", err);
  }

  const logout = () => {
    localStorage.removeItem("token");
    router.replace("/auth/login");
  };

  return (
    <aside className="h-screen w-64 border-r bg-white p-4 flex flex-col">

      {/* Logo */}
      <div className="flex items-center gap-2 mb-4 px-2">
        <div className="w-9 h-9 rounded-xl bg-orange-500" />
        <div className="font-bold text-lg">SatışTakip</div>
      </div>

      {/* Menü */}
      <nav className="flex-1 space-y-1">
        <MenuItem href="/dashboard" icon="🏠" label="Anasayfa" />

        <MenuItem href="/dashboard/ayarlar/firma" icon="🏢" label="Firma Ayarları" />
        <MenuItem href="/dashboard/api-settings" icon="⚙️" label="API Ayarları" />

        {/* 🔶 Pazaryerleri Bölümü */}
        <div className="mt-3 mb-1 px-3 text-xs font-bold text-slate-500 uppercase">
          Pazaryerleri
        </div>

        {/* 🟦 Hepsiburada */}
        <MenuItem href="/dashboard/hepsiburada/orders" icon="🛍️" label="Hepsiburada Siparişleri" />
        <MenuItem href="/dashboard/hepsiburada/products" icon="📦" label="Hepsiburada Ürünleri" />
        <MenuItem href="/dashboard/hepsiburada/settings" icon="🔑" label="Hepsiburada API Ayarları" />

        {/* 🟨 Trendyol */}
        <MenuItem href="/dashboard/trendyol/orders" icon="🧾" label="Trendyol Siparişleri" />
        <MenuItem href="/dashboard/trendyol/products" icon="📦" label="Trendyol Ürünleri" />
        <MenuItem href="/dashboard/trendyol/settings" icon="🔑" label="Trendyol API Ayarları" />

        {/* 🟣 Trendyol BuyBox */}
        <MenuItem href="/dashboard/pazaryeri/buybox" icon="📊" label="Trendyol BuyBox" />

        {/* 🔴 N11 Sipariş Yönetimi */}
        <MenuItem href="/dashboard/n11/orders" icon="🛒" label="N11 Siparişleri" />
        <MenuItem href="/dashboard/n11/settings" icon="🔑" label="N11 API Ayarları" />

        {/* 🔥 N11 Ürün Yönetimi */}
        <div className="mt-3 mb-1 px-3 text-xs font-bold text-slate-500 uppercase">
          N11 Ürün Yönetimi
        </div>

        <MenuItem href="/dashboard/n11/products" icon="📦" label="N11 Ürünleri" />
        <MenuItem href="/dashboard/n11/products-sync" icon="🔄" label="Ürün Senkronize" />
        <MenuItem href="/dashboard/n11/add-product" icon="➕" label="N11 Ürün Gönder" />

        {/* 📁 E-Belge */}
        <div className="mt-3 mb-1 px-3 text-xs font-bold text-slate-500 uppercase">
          E-Belge
        </div>

        <MenuItem href="/dashboard/efatura" icon="📄" label="E-Fatura Paneli" />

        {/* 📊 ERP Yönetimi */}
        <MenuItem href="/dashboard/cari" icon="👥" label="Cariler" />
        <MenuItem href="/dashboard/urunler" icon="📦" label="Ürünler" />
        <MenuItem href="/dashboard/urun-satis" icon="🛒" label="Ürün Satış" />
        <MenuItem href="/dashboard/urun-alis" icon="📥" label="Ürün Alış" />
        <MenuItem href="/dashboard/cari-tahsilat" icon="💰" label="Cari Tahsilat / Ödeme" />

        <MenuItem href="/dashboard/cari-ekstresi" icon="📑" label="Cari Ekstresi" />
        <MenuItem href="/dashboard/stok-raporu" icon="📊" label="Stok Raporu" />
        <MenuItem href="/dashboard/stok-hareketleri" icon="🔄" label="Stok Hareketleri" />
        <MenuItem href="/dashboard/teklifler" icon="📄" label="Fiyat Teklifleri" />
        <MenuItem href="/dashboard/raporlar" icon="📈" label="Genel Raporlar" />

        {/* 🔥 Sadece Admin */}
        {role === "admin" && (
          <>
            <div className="mt-3 mb-1 px-3 text-xs font-bold text-slate-500 uppercase">
              Admin
            </div>
            <MenuItem href="/dashboard/admin/users" icon="🛡️" label="Kullanıcı Yönetimi" />
          </>
        )}
      </nav>

      <button
        onClick={logout}
        className="mt-4 bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600"
      >
        🚪 Çıkış Yap
      </button>

      <div className="text-xs text-slate-500 px-2 mt-2">
        v1.0 • {new Date().getFullYear()}
      </div>
    </aside>
  );
}
