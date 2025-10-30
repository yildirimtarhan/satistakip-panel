// components/layout/Sidebar.jsx
import Link from "next/link";
import { useRouter } from "next/router";

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
  return (
    <aside className="h-screen w-64 border-r bg-white p-4 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-4 px-2">
        <div className="w-9 h-9 rounded-xl bg-orange-500" />
        <div className="font-bold text-lg">SatışTakip</div>
      </div>

      {/* Menu */}
      <nav className="flex-1 space-y-1">
        <MenuItem href="/dashboard" icon="🏠" label="Anasayfa" />
        <MenuItem href="/dashboard/cari" icon="👥" label="Cariler" />
        <MenuItem href="/dashboard/cari" icon="📦" label="Ürünler" />
        <MenuItem href="/dashboard/cari" icon="📊" label="Cari Hareketler" />
        <MenuItem href="/dashboard/tahsilat" icon="💳" label="Tahsilat / Ödeme" />
        <MenuItem href="/dashboard/teklifler" icon="📄" label="Fiyat Teklifleri" />
        <MenuItem href="/dashboard/raporlar" icon="📈" label="Raporlar" />
        <MenuItem href="/dashboard/ayarlar" icon="⚙️" label="Ayarlar" />
      </nav>

      {/* Footer */}
      <div className="text-xs text-slate-500 px-2">
        v1.0 • {new Date().getFullYear()}
      </div>
    </aside>
  );
}
