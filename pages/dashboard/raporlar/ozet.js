import { useState, useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  TrendingUp,
  Package,
  AlertTriangle,
  Globe,
  Users,
  DollarSign,
  ChevronRight,
} from "lucide-react";

export default function OzetDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ satis: null, stok: null, pazaryeri: null, cari: null });

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      setLoading(false);
      return;
    }
    const h = { Authorization: `Bearer ${token}` };
    const end = new Date().toISOString().split("T")[0];
    const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    Promise.all([
      fetch(`/api/reports/sales-analysis?startDate=${start}&endDate=${end}`, { headers: h }).then((r) => r.json()),
      fetch(`/api/reports/stock-analysis?startDate=${start}&endDate=${end}`, { headers: h }).then((r) => r.json()),
      fetch(`/api/reports/marketplace-sales?startDate=${start}&endDate=${end}`, { headers: h }).then((r) => r.json()),
      fetch("/api/reports/cari-ozet", { headers: h }).then((r) => r.json()),
    ])
      .then(([satis, stok, pazaryeri, cari]) => {
        setData({
          satis: satis.success ? satis : null,
          stok: stok.success ? stok : null,
          pazaryeri: pazaryeri.marketplaceStats ? pazaryeri : null,
          cari: cari.success ? cari : null,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[40vh]">
        <div className="text-gray-500">Yükleniyor...</div>
      </div>
    );
  }

  const summary = data.satis?.summary || {};
  const stokSummary = data.stok?.summary || {};
  const marketplaceStats = data.pazaryeri?.marketplaceStats || [];
  const cariSummary = data.cari?.summary || {};

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <LayoutDashboard className="text-orange-500" size={28} />
        <div>
          <h1 className="text-2xl font-bold">Özet Dashboard</h1>
          <p className="text-sm text-gray-500">Son 30 gün özeti · Tüm raporlara hızlı erişim</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link href="/dashboard/raporlar/satis-analizi" className="bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition flex items-center justify-between group">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <TrendingUp className="text-blue-600" size={24} />
            </div>
            <div>
              <div className="text-sm text-gray-500">Toplam Ciro (30 gün)</div>
              <div className="text-xl font-bold text-gray-900">
                {(summary.toplamCiro ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
              </div>
            </div>
          </div>
          <ChevronRight className="text-gray-400 group-hover:text-orange-500" size={20} />
        </Link>

        <Link href="/dashboard/raporlar/stok-analizi" className="bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition flex items-center justify-between group">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50">
              <Package className="text-green-600" size={24} />
            </div>
            <div>
              <div className="text-sm text-gray-500">Stok Değeri</div>
              <div className="text-xl font-bold text-gray-900">
                {(stokSummary.toplamStokDegeri ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
              </div>
            </div>
          </div>
          <ChevronRight className="text-gray-400 group-hover:text-orange-500" size={20} />
        </Link>

        <Link href="/dashboard/raporlar/stok-analizi" className="bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition flex items-center justify-between group">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-50">
              <AlertTriangle className="text-red-600" size={24} />
            </div>
            <div>
              <div className="text-sm text-gray-500">Kritik Stok</div>
              <div className="text-xl font-bold text-red-600">{stokSummary.kritikStokSayisi ?? 0} ürün</div>
            </div>
          </div>
          <ChevronRight className="text-gray-400 group-hover:text-orange-500" size={20} />
        </Link>

        <Link href="/dashboard/raporlar/cari-ozet" className="bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition flex items-center justify-between group">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50">
              <Users className="text-purple-600" size={24} />
            </div>
            <div>
              <div className="text-sm text-gray-500">Cariler / Bakiye</div>
              <div className="text-xl font-bold text-gray-900">
                {cariSummary.cariSayisi ?? 0} cari · {(cariSummary.toplamBakiye ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 0 })} ₺
              </div>
            </div>
          </div>
          <ChevronRight className="text-gray-400 group-hover:text-orange-500" size={20} />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="text-orange-500" size={22} />
            <h2 className="font-semibold">Pazaryeri Özeti (30 gün)</h2>
          </div>
          <ul className="space-y-2">
            {marketplaceStats.slice(0, 5).map((m) => (
              <li key={m.marketplace} className="flex justify-between text-sm">
                <span>{m.marketplace || "—"}</span>
                <span className="font-medium">{(m.totalSales || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺ · {m.orderCount || 0} sipariş</span>
              </li>
            ))}
          </ul>
          <Link href="/dashboard/raporlar/pazaryeri-satis" className="mt-3 inline-flex items-center gap-1 text-sm text-orange-600 hover:underline">
            Detay <ChevronRight size={14} />
          </Link>
        </div>

        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="text-green-500" size={22} />
            <h2 className="font-semibold">Satış Özeti</h2>
          </div>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between"><span>Net Kar</span><span className="font-medium">{(summary.netKar ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</span></li>
            <li className="flex justify-between"><span>İşlem Sayısı</span><span className="font-medium">{summary.toplamIslem ?? 0}</span></li>
            <li className="flex justify-between"><span>Kar Marjı</span><span className="font-medium">%{summary.karMarji ?? 0}</span></li>
          </ul>
          <Link href="/dashboard/raporlar/satis-analizi" className="mt-3 inline-flex items-center gap-1 text-sm text-orange-600 hover:underline">
            Detay <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/raporlar/satis-analizi" className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600">Satış Analizi</Link>
        <Link href="/dashboard/raporlar/stok-analizi" className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">Stok Analizi</Link>
        <Link href="/dashboard/raporlar/kar-zarar" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Kar / Zarar</Link>
        <Link href="/dashboard/raporlar/pazaryeri-satis" className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">Pazaryeri Raporu</Link>
        <Link href="/dashboard/raporlar/urun-performansi" className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700">Ürün Performansı</Link>
        <Link href="/dashboard/raporlar/cari-ozet" className="px-4 py-2 bg-slate-600 text-white rounded-lg text-sm font-medium hover:bg-slate-700">Cari Özet</Link>
      </div>
    </div>
  );
}
