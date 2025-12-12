"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import { jwtDecode } from "jwt-decode";
import { useEffect, useState } from "react";

const MenuItem = ({ href, icon, label }) => {
  const router = useRouter();
  const active =
    router.pathname === href || router.pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition
        ${
          active
            ? "bg-orange-100 text-orange-700"
            : "text-slate-700 hover:bg-slate-100"
        }`}
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

export default function Sidebar() {
  const router = useRouter();
  const [role, setRole] = useState(null);

  // Kullanıcı rolünü decode et
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

  return (
    <aside className="h-screen w-64 border-r bg-white p-4 flex flex-col">
      {/* Logo / Header */}
      <div className="flex items-center gap-2 mb-5 px-2">
        <div className="w-9 h-9 rounded-xl bg-orange-500 shadow-sm flex items-center justify-center text-white font-bold">
          ST
        </div>
        <div>
          <div className="font-bold text-lg leading-tight">SatışTakip ERP</div>
          <div className="text-[11px] text-slate-500">
            Çoklu Firma • Çoklu Kullanıcı
          </div>
        </div>
      </div>

      {/* Menü */}
      <nav className="flex-1 space-y-1 overflow-y-auto">

        {/* ============================
            GENEL
        ============================ */}
        <SectionTitle>Genel</SectionTitle>
        <MenuItem href="/dashboard" icon="🏠" label="Anasayfa" />

        <MenuItem
          href="/dashboard/ayarlar/firma"
          icon="🏢"
          label="Firma Ayarları"
        />

        <MenuItem href="/dashboard/api-settings" icon="⚙️" label="API Ayarları" />

        {/* ============================
            E-DÖNÜŞÜM MODÜLLERİ
        ============================ */}
        <SectionTitle>E-Dönüşüm</SectionTitle>

        <MenuItem
          href="/dashboard/e-donusum"
          icon="🌀"
          label="E-Dönüşüm Paketi"
        />

        <MenuItem
          href="/dashboard/e-donusum/e-imza"
          icon="✍️"
          label="E-İmza Başvuru"
        />

        <MenuItem
          href="/dashboard/e-donusum/kep"
          icon="📬"
          label="KEP Adresi"
        />

        <MenuItem
          href="/dashboard/e-donusum/mali-muhur"
          icon="🔐"
          label="Mali Mühür"
        />

        <MenuItem
          href="/dashboard/e-donusum/efatura-kontor"
          icon="🧾"
          label="E-Fatura Kontör"
        />

        {/* ============================
            E-FATURA & E-İRSALİYE BAŞVURU
        ============================ */}

        <MenuItem
          href="/dashboard/edonusum/efatura-basvuru"
          icon="🧾"
          label="E-Fatura Başvuru"
        />

        <MenuItem
          href="/dashboard/edonusum/basvurularim"
          icon="📄"
          label="Başvurularım"
        />

        {/* ADMIN → Başvuru Onay Paneli */}
        {role === "admin" && (
          <MenuItem
            href="/dashboard/admin/basvuru-onay"
            icon="🛡️"
            label="Başvuru Onay Paneli"
          />
        )}

        {/* ============================
            PAZARYERLERİ
        ============================ */}
        <SectionTitle>Pazaryerleri</SectionTitle>

        <MenuItem
          href="/dashboard/hepsiburada/orders"
          icon="🛍️"
          label="HB Siparişleri"
        />
        <MenuItem
          href="/dashboard/hepsiburada/products"
          icon="📦"
          label="HB Ürünleri"
        />

        <MenuItem
          href="/dashboard/trendyol/orders"
          icon="🧾"
          label="Trendyol Siparişleri"
        />
        <MenuItem
          href="/dashboard/trendyol/products"
          icon="📦"
          label="Trendyol Ürünleri"
        />

        <MenuItem
          href="/dashboard/n11/orders"
          icon="🛒"
          label="N11 Siparişleri"
        />
        <MenuItem
          href="/dashboard/n11/products"
          icon="📦"
          label="N11 Ürün Listesi"
        />
        <MenuItem
          href="/dashboard/n11/add-product"
          icon="➕"
          label="N11 Ürün Gönder"
        />

        {/* ============================
            E-BELGE PANELİ
        ============================ */}
        <SectionTitle>E-Belge</SectionTitle>
        <MenuItem
          href="/dashboard/efatura"
          icon="📄"
          label="E-Fatura Paneli"
        />

        {/* ============================
            ERP MODÜLLERİ
        ============================ */}
        <SectionTitle>ERP Modülleri</SectionTitle>

        <MenuItem href="/dashboard/cari" icon="👥" label="Cariler" />
        <MenuItem href="/dashboard/cari-ekstre" icon="📈" label="Cari Ekstre" />
        <MenuItem
          href="/dashboard/cari-tahsilat"
          icon="💰"
          label="Tahsilat / Ödeme"
        />

        <MenuItem href="/dashboard/urunler" icon="📦" label="Ürünler" />
        <MenuItem href="/dashboard/urun-alis" icon="📥" label="Ürün Alış" />
        <MenuItem href="/dashboard/urun-satis" icon="🛒" label="Ürün Satış" />

        <MenuItem href="/dashboard/teklifler" icon="📃" label="Teklif Formu" />
        <MenuItem href="/dashboard/stok-raporu" icon="📊" label="Stok Raporu" />

        {/* ============================
            ADMIN PANELİ
        ============================ */}
        {role === "admin" && (
          <>
            <SectionTitle>Admin</SectionTitle>

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
          </>
        )}
      </nav>

      {/* Çıkış */}
      <button
        onClick={logout}
        className="mt-4 bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-red-600 transition"
      >
        🚪 Çıkış Yap
      </button>
    </aside>
  );
}
