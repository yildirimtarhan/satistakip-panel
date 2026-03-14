"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import { jwtDecode } from "jwt-decode";
import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, Globe, ChevronDown, ChevronRight, Package, DollarSign, Box, Users, LayoutDashboard, FileText, X } from "lucide-react";

const raporMenuItems = [
  {
    title: "Raporlar",
    icon: BarChart3,
    submenu: [
      { title: "Özet Dashboard", href: "/dashboard/raporlar/ozet", icon: LayoutDashboard, description: "Tüm KPI özeti" },
      { title: "Satış Analizi", href: "/dashboard/raporlar/satis-analizi", icon: TrendingUp, description: "Detaylı satış ve gelir raporları" },
      { title: "Stok Analizi", href: "/dashboard/raporlar/stok-analizi", icon: Package, description: "Stok hareketleri ve değerleme" },
      { title: "Kar / Zarar", href: "/dashboard/raporlar/kar-zarar", icon: DollarSign, description: "Gelir-gider ve karlılık analizi" },
      { title: "Sipariş Kâr/Zarar", href: "/dashboard/raporlar/siparis-kar-zarar", icon: FileText, description: "Sipariş bazlı net kâr ve zarar" },
      { title: "Pazaryeri Raporu", href: "/dashboard/raporlar/pazaryeri-satis", icon: Globe, description: "Platform bazlı satış analizi" },
      { title: "Ürün Performansı", href: "/dashboard/raporlar/urun-performansi", icon: Box, description: "En çok satan ve karlı ürünler" },
      { title: "Cari Özet", href: "/dashboard/raporlar/cari-ozet", icon: Users, description: "Cari bazlı ciro ve bakiye" },
    ],
  },
];

const MenuItem = ({ href, icon, label, onLinkClick }) => {
  const router = useRouter();
  const active =
    router.pathname === href || router.pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      onClick={onLinkClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition touch-manipulation
        ${active ? "bg-orange-100 text-orange-700" : "text-slate-700 hover:bg-slate-100"}`}
    >
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </Link>
  );
};

const SectionTitle = ({ children }) => (
  <div className="mt-4 mb-1 px-3 text-[11px] font-bold tracking-wide text-slate-500 uppercase">
    {children}
  </div>
);

const SubmenuItem = ({ href, icon: Icon, label, description, onLinkClick }) => {
  const router = useRouter();
  const active = router.pathname === href || router.pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      title={description}
      onClick={onLinkClick}
      className={`flex items-center gap-2 pl-8 pr-3 py-2.5 rounded-lg text-sm transition touch-manipulation
        ${active ? "bg-orange-50 text-orange-700" : "text-slate-600 hover:bg-slate-50"}`}
    >
      {Icon && <Icon size={16} className="shrink-0" />}
      <span>{label}</span>
    </Link>
  );
};

const HB_MENU = [
  { href: "/dashboard/api-settings?tab=hepsiburada", label: "HB API Ayarları", icon: "⚙️" },
  { href: "/dashboard/hepsiburada/orders", label: "HB Siparişleri", icon: "🛍️" },
  { href: "/dashboard/hepsiburada/products", label: "HB Ürünleri", icon: "📦" },
  { href: "/dashboard/hepsiburada/erp-mapping", label: "HB–ERP Eşleştirme", icon: "🔗" },
  { href: "/dashboard/hepsiburada/price-stock", label: "HB Fiyat/Stok Güncelle", icon: "💰" },
  { href: "/dashboard/hepsiburada/accounting", label: "HB Muhasebe & Finans", icon: "💰" },
  { href: "/dashboard/hepsiburada/store-account", label: "HB Mağaza Hesabı", icon: "🏪" },
  { href: "/dashboard/hepsiburada/delivery", label: "HB Teslimat Bildirimi", icon: "🚚" },
  { href: "/dashboard/hepsiburada/claims", label: "HB Talepler", icon: "📋" },
  { href: "/dashboard/hepsiburada/qa", label: "HB Soru Cevap", icon: "❓" },
];

const N11_MENU = [
  { href: "/dashboard/api-settings?tab=n11", label: "N11 API Ayarları", icon: "⚙️" },
  { href: "/dashboard/n11/orders", label: "N11 Siparişleri", icon: "🛍️" },
  { href: "/dashboard/n11/products", label: "N11 Ürün Listesi", icon: "📦" },
  { href: "/dashboard/n11/add-product", label: "N11 Ürün Gönder", icon: "➕" },
];

// Trendyol — Tüm rolleri kullanacak yapı (API Ayarları önce)
const PAZARAMA_MENU = [
  { href: "/dashboard/api-settings?tab=pazarama", label: "Pazarama API Ayarları", icon: "⚙️" },
  { href: "/dashboard/pazarama/orders", label: "Siparişler", icon: "🧾" },
  { href: "/dashboard/pazarama/returns", label: "İadeler", icon: "🔄" },
  { href: "/dashboard/pazarama/accounting", label: "Muhasebe & Finans", icon: "💰" },
  { href: "/dashboard/pazarama/products", label: "Ürünler", icon: "📦" },
  { href: "/dashboard/pazaryeri-gonder", label: "Ürün Gönder", icon: "🚀" },
];

const TRENDYOL_MENU = [
  { href: "/dashboard/api-settings?tab=trendyol", label: "Trendyol API Ayarları", icon: "⚙️" },
  { href: "/dashboard/trendyol/test-all", label: "API Test Merkezi", icon: "🧪" },
  { href: "/dashboard/trendyol/orders", label: "Sipariş Entegrasyonu", icon: "🧾" },
  { href: "/dashboard/trendyol/products", label: "Ürün Entegrasyonu", icon: "📦" },
  { href: "/dashboard/trendyol/delivery", label: "Teslimat Entegrasyonu", icon: "🚚" },
  { href: "/dashboard/trendyol/returns", label: "İade Entegrasyonu", icon: "🔄" },
  { href: "/dashboard/trendyol/invoice", label: "Fatura Entegrasyonu", icon: "📄" },
  { href: "/dashboard/trendyol/accounting", label: "Muhasebe & Finans", icon: "💰" },
  { href: "/dashboard/trendyol/seller-info", label: "Satıcı Bilgileri", icon: "🏪" },
  { href: "/dashboard/trendyol/qa", label: "Soru Cevap", icon: "❓" },
  { href: "/dashboard/trendyol/webhook", label: "Webhook Entegrasyonu", icon: "🔗" },
  { href: "/dashboard/pazaryeri-gonder", label: "Ürün Gönder", icon: "🚀" },
  { href: "/dashboard/pazaryeri/buybox", label: "BuyBox", icon: "💱" },
];

function HepsiburadaSubmenu({ onLinkClick }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isActive = HB_MENU.some((m) => router.pathname === m.href || router.pathname.startsWith(m.href + "/"));
  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center justify-between w-full gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition touch-manipulation
          ${open || isActive ? "bg-slate-100 text-slate-800" : "text-slate-700 hover:bg-slate-100"}`}
      >
        <span className="flex items-center gap-3">
          <span className="text-lg">🛒</span>
          <span>Hepsiburada</span>
        </span>
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      {(open || isActive) && (
        <div className="mt-1 space-y-0.5">
          {HB_MENU.map((item) => {
            const active = router.pathname === item.href || router.pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onLinkClick}
                className={`flex items-center gap-2 pl-8 pr-3 py-2.5 rounded-lg text-sm transition touch-manipulation
                  ${active ? "bg-orange-50 text-orange-700" : "text-slate-600 hover:bg-slate-50"}`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function N11Submenu({ onLinkClick }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isActive = N11_MENU.some((m) => router.pathname === m.href || router.pathname.startsWith(m.href + "/"));
  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center justify-between w-full gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition touch-manipulation
          ${open || isActive ? "bg-slate-100 text-slate-800" : "text-slate-700 hover:bg-slate-100"}`}
      >
        <span className="flex items-center gap-3">
          <span className="text-lg">🛒</span>
          <span>N11</span>
        </span>
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      {(open || isActive) && (
        <div className="mt-1 space-y-0.5">
          {N11_MENU.map((item) => {
            const active = router.pathname === item.href || router.pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onLinkClick}
                className={`flex items-center gap-2 pl-8 pr-3 py-2.5 rounded-lg text-sm transition touch-manipulation
                  ${active ? "bg-orange-50 text-orange-700" : "text-slate-600 hover:bg-slate-50"}`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PazaramaSubmenu({ onLinkClick }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isActive = PAZARAMA_MENU.some((m) => router.pathname === m.href || router.pathname.startsWith(m.href + "/"));
  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center justify-between w-full gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition touch-manipulation
          ${open || isActive ? "bg-slate-100 text-slate-800" : "text-slate-700 hover:bg-slate-100"}`}
      >
        <span className="flex items-center gap-3">
          <span className="text-lg">🛒</span>
          <span>Pazarama</span>
        </span>
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      {(open || isActive) && (
        <div className="mt-1 space-y-0.5">
          {PAZARAMA_MENU.map((item) => {
            const active = router.pathname === item.href || router.pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onLinkClick}
                className={`flex items-center gap-2 pl-8 pr-3 py-2.5 rounded-lg text-sm transition touch-manipulation
                  ${active ? "bg-orange-50 text-orange-700" : "text-slate-600 hover:bg-slate-50"}`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TrendyolSubmenu({ onLinkClick }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isActive = TRENDYOL_MENU.some((m) => router.pathname === m.href || router.pathname.startsWith(m.href + "/"));
  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center justify-between w-full gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition touch-manipulation
          ${open || isActive ? "bg-slate-100 text-slate-800" : "text-slate-700 hover:bg-slate-100"}`}
      >
        <span className="flex items-center gap-3">
          <span className="text-lg">🛒</span>
          <span>Trendyol</span>
        </span>
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      {(open || isActive) && (
        <div className="mt-1 space-y-0.5">
          {TRENDYOL_MENU.map((item) => {
            const active = router.pathname === item.href || router.pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onLinkClick}
                className={`flex items-center gap-2 pl-8 pr-3 py-2.5 rounded-lg text-sm transition touch-manipulation
                  ${active ? "bg-orange-50 text-orange-700" : "text-slate-600 hover:bg-slate-50"}`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ mobileOpen = false, onClose }) {
  const router = useRouter();
  const [role, setRole] = useState(null);
  const [openRaporlar, setOpenRaporlar] = useState(false);

  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const handleLinkClick = () => {
    if (onClose) onClose();
  };

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const token = localStorage.getItem("token");
      if (!token) return;

      const decoded = jwtDecode(token);
      setRole(decoded?.role || null);
    } catch (err) {
      console.error("Sidebar decode hatası:", err);
    }
  }, []);

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
    }
    router.replace("/auth/login");
  };

  const asideClass =
    "h-screen w-64 border-r bg-white p-4 flex flex-col z-50 " +
    "md:relative md:translate-x-0 md:shadow-none " +
    (mobileOpen
      ? "fixed inset-y-0 left-0 translate-x-0 shadow-xl max-w-[85vw]"
      : "fixed inset-y-0 left-0 -translate-x-full md:translate-x-0");

  return (
    <aside className={asideClass}>
      {/* Mobil: Kapat butonu */}
      <div className="flex items-center justify-between mb-3 md:mb-5">
        <div className="flex items-center gap-2 px-2">
          <div className="w-9 h-9 rounded-xl bg-orange-500 shadow-sm flex items-center justify-center text-white font-bold">
            ST
          </div>
          <div>
            <div className="font-bold text-lg leading-tight">SatışTakip ERP</div>
            <div className="text-[11px] text-slate-500 hidden md:block">
              Çoklu Firma • Çoklu Kullanıcı
            </div>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 touch-manipulation"
            aria-label="Menüyü kapat"
          >
            <X size={24} />
          </button>
        )}
      </div>

      {/* Menü */}
      <nav className="flex-1 space-y-1 overflow-y-auto">
        <SectionTitle>Genel</SectionTitle>
        <MenuItem onLinkClick={handleLinkClick} href="/dashboard" icon="🏠" label="Anasayfa" />
        <MenuItem onLinkClick={handleLinkClick} href="/dashboard/ayarlar/firma" icon="🏢" label="Firma Ayarları" />
        <MenuItem onLinkClick={handleLinkClick} href="/dashboard/api-settings" icon="⚙️" label="API Ayarları" />

        <SectionTitle>E-Dönüşüm</SectionTitle>
        <MenuItem onLinkClick={handleLinkClick} href="/dashboard/e-donusum" icon="🌀" label="E-Dönüşüm Paketi" />
        <MenuItem onLinkClick={handleLinkClick} href="/dashboard/e-donusum/e-imza" icon="✍️" label="E-İmza Başvuru" />
        <MenuItem onLinkClick={handleLinkClick} href="/dashboard/e-donusum/kep" icon="📬" label="KEP Adresi" />
        <MenuItem onLinkClick={handleLinkClick} href="/dashboard/e-donusum/mali-muhur" icon="🔐" label="Mali Mühür" />
        <MenuItem onLinkClick={handleLinkClick} href="/dashboard/e-donusum/efatura-kontor" icon="🧾" label="E-Fatura Kontör" />

        <MenuItem onLinkClick={handleLinkClick} href="/dashboard/edonusum/efatura-basvuru" icon="🧾" label="E-Fatura Başvuru" />
        <MenuItem onLinkClick={handleLinkClick} href="/dashboard/edonusum/basvurularim" icon="📄" label="Başvurularım" />

        {role === "admin" && (
          <MenuItem
            href="/dashboard/admin/basvuru-onay"
            icon="🛡️"
            label="Başvuru Onay Paneli"
          />
        )}

        <SectionTitle>Pazaryerleri</SectionTitle>
        <HepsiburadaSubmenu onLinkClick={handleLinkClick} />
        <TrendyolSubmenu onLinkClick={handleLinkClick} />
        <PazaramaSubmenu onLinkClick={handleLinkClick} />
        <N11Submenu onLinkClick={handleLinkClick} />
        <MenuItem onLinkClick={handleLinkClick} href="/dashboard/pazaryeri-gonder" icon="🚀" label="Pazaryerine Gönder" />

        <SectionTitle>E-Belge</SectionTitle>
        <MenuItem onLinkClick={handleLinkClick} href="/dashboard/efatura" icon="📄" label="E-Fatura Paneli" />

        {/* ================= ERP MODÜLLERİ ================= */}
        <SectionTitle>ERP Modülleri</SectionTitle>

        <MenuItem onLinkClick={handleLinkClick} href="/dashboard/cari" icon="👥" label="Cariler" />
        <MenuItem onLinkClick={handleLinkClick} href="/dashboard/cari-ekstre" icon="📈" label="Cari Ekstre" />
        <MenuItem onLinkClick={handleLinkClick} href="/dashboard/cari-tahsilat" icon="💰" label="Tahsilat / Ödeme" />

        <MenuItem onLinkClick={handleLinkClick} href="/dashboard/urunler" icon="📦" label="Ürünler" />

        {/* 🔥 ALIŞLAR MENÜSÜ (YENİ) */}
        <SectionTitle>Alışlar</SectionTitle>
        <MenuItem onLinkClick={handleLinkClick} href="/dashboard/urun-alis" icon="📥" label="Ürün Alışı" />
        <MenuItem onLinkClick={handleLinkClick} href="/dashboard/alislar" icon="📄" label="Alış Listesi" />
        <MenuItem
  href="/dashboard/alislar-iptal"
  icon="⛔"
  label="İptal Edilen Alışlar"
/>



        <MenuItem onLinkClick={handleLinkClick} href="/dashboard/urun-satis" icon="🛒" label="Ürün Satış" />
        <MenuItem onLinkClick={handleLinkClick} href="/dashboard/satislar" icon="🧾" label="Satışlar" />
        <MenuItem
  href="/dashboard/satis-iade-iptal"
  icon="🔄"
  label="İade / İptaller"
/>

        <SectionTitle>Raporlar</SectionTitle>
        {raporMenuItems.map((menu) => (
          <div key={menu.title}>
            <button
              type="button"
              onClick={() => setOpenRaporlar((v) => !v)}
              className={`flex items-center justify-between w-full gap-3 px-3 py-2 rounded-xl text-sm font-medium transition
                ${openRaporlar ? "bg-slate-100 text-slate-800" : "text-slate-700 hover:bg-slate-100"}`}
            >
              <span className="flex items-center gap-3">
                <menu.icon size={20} className="shrink-0" />
                <span>{menu.title}</span>
              </span>
              {openRaporlar ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {openRaporlar && (
              <div className="mt-1 space-y-0.5">
                {menu.submenu.map((item) => (
                  <SubmenuItem onLinkClick={handleLinkClick}
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={item.title}
                    description={item.description}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        <MenuItem onLinkClick={handleLinkClick} href="/dashboard/teklifler" icon="📃" label="Teklif Formu" />

        {role === "admin" && (
  <>
    <SectionTitle>Admin</SectionTitle>

    <MenuItem
      href="/dashboard/admin"
      icon="👑"
      label="Yönetici Paneli"
    />

    <MenuItem
      href="/dashboard/admin/users"
      icon="🛡️"
      label="Kullanıcı Yönetimi"
    />

    <MenuItem
      href="/dashboard/admin/basvuru-onay"
      icon="📤"
      label="E-Belge Başvuru Onayı"
    />

    {/* 🔥 YENİ EKLENEN ERP API ENTEGRASYON */}
    <MenuItem
      href="/dashboard/integration-settings"
      icon="🔗"
      label="ERP API Entegrasyonu"
    />
  </>
)}
      </nav>

      <button
        onClick={logout}
        className="mt-4 bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-red-600 transition"
      >
        🚪 Çıkış Yap
      </button>
    </aside>
  );
}
