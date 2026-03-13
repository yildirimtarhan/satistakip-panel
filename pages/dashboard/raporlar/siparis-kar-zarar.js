import { useState, useEffect } from "react";
import {
  FileText,
  Filter,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format, subDays } from "date-fns";
import { tr } from "date-fns/locale";

export default function SiparisKarZararPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    marketplace: "all",
    page: 1,
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const h = token ? { Authorization: `Bearer ${token}` } : {};
      const params = new URLSearchParams({
        startDate: filters.startDate,
        endDate: filters.endDate,
        marketplace: filters.marketplace,
        page: String(filters.page),
        limit: "20",
      });
      const res = await fetch(`/api/reports/order-profit-loss?${params}`, { headers: h });
      const result = await res.json();
      if (result.success) setData(result);
      else setData(null);
    } catch (error) {
      console.error("Error:", error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!data || !data.orders?.length) {
      alert("Dışa aktarılacak veri yok.");
      return;
    }
    const headers = [
      "Sipariş No",
      "Tarih",
      "Pazaryeri",
      "Brüt Satış (₺)",
      "Maliyet (₺)",
      "Komisyon (₺)",
      "Kargo (₺)",
      "Net Kâr (₺)",
      "Kar Marjı (%)",
      "Durum",
    ];
    const rows = data.orders.map((o) => [
      o.saleNo,
      o.tarih ? format(new Date(o.tarih), "dd.MM.yyyy", { locale: tr }) : "-",
      o.pazaryeri,
      (o.brutSatis ?? 0).toFixed(2),
      (o.maliyet ?? 0).toFixed(2),
      (o.komisyon ?? 0).toFixed(2),
      (o.kargo ?? 0).toFixed(2),
      (o.netKar ?? 0).toFixed(2),
      (o.karMarji ?? 0).toFixed(2),
      o.durum,
    ]);
    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `siparis-kar-zarar-${filters.startDate}-${filters.endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const goToPage = (page) => {
    const totalPages = data?.pagination?.totalPages || 1;
    const p = Math.max(1, Math.min(page, totalPages));
    setFilters((f) => ({ ...f, page: p }));
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          Yükleniyor...
        </div>
      </div>
    );
  }

  const summary = data?.summary || {};
  const orders = data?.orders || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sipariş Kâr/Zarar Raporu</h1>
          <p className="text-gray-500 mt-1">
            Sipariş bazlı net kâr ve zarar detayı · Maliyet, komisyon, kargo ayrıştırmalı
          </p>
        </div>
        <button
          onClick={exportToExcel}
          disabled={!orders.length}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          <Download size={20} />
          Excel İndir
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="text-gray-400 shrink-0" size={20} />
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value, page: 1 })}
            className="border border-gray-200 rounded-lg px-3 py-2.5 w-full focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="text-gray-400 shrink-0" size={20} />
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value, page: 1 })}
            className="border border-gray-200 rounded-lg px-3 py-2.5 w-full focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
        <select
          value={filters.marketplace}
          onChange={(e) => setFilters({ ...filters, marketplace: e.target.value, page: 1 })}
          className="border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          <option value="all">Tüm Pazaryerleri</option>
          <option value="Trendyol">Trendyol</option>
          <option value="Hepsiburada">Hepsiburada</option>
          <option value="N11">N11</option>
          <option value="Mağaza">Mağaza</option>
        </select>
        <button
          onClick={fetchData}
          className="bg-orange-500 text-white px-4 py-2.5 rounded-xl hover:bg-orange-600 flex items-center justify-center gap-2 font-medium"
        >
          <Filter size={20} />
          Filtrele
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SummaryCard
          title="Toplam Sipariş"
          value={summary.toplamSiparis ?? 0}
          icon={<FileText className="text-slate-600" size={24} />}
          color="slate"
        />
        <SummaryCard
          title="Ortalama Kar Marjı"
          value={`%${(summary.ortalamaKarMarji ?? 0).toFixed(1)}`}
          icon={<TrendingUp className="text-emerald-600" size={24} />}
          color="green"
        />
        <SummaryCard
          title="Toplam Net Kâr"
          value={`₺${(summary.toplamNetKar ?? 0).toLocaleString("tr-TR")}`}
          icon={<TrendingUp className="text-blue-600" size={24} />}
          color="blue"
        />
        <SummaryCard
          title="Zarar Sipariş"
          value={summary.zararSiparis ?? 0}
          icon={<AlertTriangle className="text-amber-600" size={24} />}
          color="amber"
          subtitle="Net kârı negatif olan sipariş"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">Sipariş Detayları</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {pagination.total} sipariş · Sayfa {pagination.page} / {Math.max(1, pagination.totalPages)}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Sipariş No
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Tarih
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Pazaryeri
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Brüt Satış
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Maliyet
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Komisyon
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Kargo
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Net Kâr
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Kar Marjı
                </th>
                <th className="px-6 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Durum
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                    Bu kriterlere uygun sipariş bulunamadı.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr
                    key={o._id}
                    className={`hover:bg-gray-50 transition ${
                      (o.netKar ?? 0) < 0 ? "bg-amber-50/50" : ""
                    }`}
                  >
                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                      {o.saleNo}
                    </td>
                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                      {o.tarih
                        ? format(new Date(o.tarih), "dd.MM.yyyy", { locale: tr })
                        : "-"}
                    </td>
                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{o.pazaryeri}</td>
                    <td className="px-6 py-4 text-right font-medium whitespace-nowrap">
                      ₺{(o.brutSatis ?? 0).toLocaleString("tr-TR")}
                    </td>
                    <td className="px-6 py-4 text-right text-red-600 whitespace-nowrap">
                      ₺{(o.maliyet ?? 0).toLocaleString("tr-TR")}
                    </td>
                    <td className="px-6 py-4 text-right text-red-600 whitespace-nowrap">
                      ₺{(o.komisyon ?? 0).toLocaleString("tr-TR")}
                    </td>
                    <td className="px-6 py-4 text-right text-red-600 whitespace-nowrap">
                      ₺{(o.kargo ?? 0).toLocaleString("tr-TR")}
                    </td>
                    <td
                      className={`px-6 py-4 text-right font-semibold whitespace-nowrap ${
                        (o.netKar ?? 0) >= 0 ? "text-emerald-600" : "text-amber-600"
                      }`}
                    >
                      ₺{(o.netKar ?? 0).toLocaleString("tr-TR")}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 rounded-lg text-xs font-semibold ${
                          (o.karMarji ?? 0) >= 20
                            ? "bg-emerald-100 text-emerald-800"
                            : (o.karMarji ?? 0) >= 10
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        %{(o.karMarji ?? 0).toFixed(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      {(o.netKar ?? 0) < 0 ? (
                        <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-medium">
                          <TrendingDown size={14} />
                          Zarar
                        </span>
                      ) : (
                        <span className="text-emerald-600 text-xs font-medium">✓ Kâr</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Toplam {pagination.total} sipariş
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm font-medium text-gray-700 px-3">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => goToPage(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon, color, subtitle }) {
  const colors = {
    slate: "bg-slate-50 border-slate-200",
    green: "bg-emerald-50 border-emerald-200",
    blue: "bg-blue-50 border-blue-200",
    amber: "bg-amber-50 border-amber-200",
  };
  return (
    <div className={`${colors[color]} border rounded-xl p-5`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-0.5">{title}</p>
          <h3 className="text-xl font-bold text-gray-900">{value}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className="p-2.5 bg-white rounded-lg shadow-sm">{icon}</div>
      </div>
    </div>
  );
}
