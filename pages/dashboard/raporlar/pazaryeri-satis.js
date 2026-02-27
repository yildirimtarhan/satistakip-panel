import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const COLORS = ["#FF6600", "#F27A24", "#E8491C", "#00A651", "#8884d8"];

export default function PazaryeriSatislariPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    marketplace: "all",
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) {
        setError("Oturum açmanız gerekiyor.");
        return;
      }
      const params = new URLSearchParams();
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);
      if (filters.marketplace && filters.marketplace !== "all") params.set("marketplace", filters.marketplace);
      const res = await fetch(`/api/reports/marketplace-sales?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Veri alınamadı");
      setData(result);
    } catch (err) {
      setError(err.message || "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters.startDate, filters.endDate, filters.marketplace]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Pazaryeri Satışları</h1>

      <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-wrap gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Başlangıç</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className="border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Bitiş</label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Pazaryeri</label>
          <select
            value={filters.marketplace}
            onChange={(e) => setFilters({ ...filters, marketplace: e.target.value })}
            className="border rounded px-3 py-2"
          >
            <option value="all">Tümü</option>
            <option value="n11">N11</option>
            <option value="hepsiburada">Hepsiburada</option>
            <option value="trendyol">Trendyol</option>
            <option value="Mağaza">Mağaza</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={fetchData}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            Yenile
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center py-12 text-gray-500">Yükleniyor...</div>
      )}

      {!loading && data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {(data.marketplaceStats || []).map((m, i) => {
              const ortSiparis = (m.orderCount > 0 && m.totalSales) ? (m.totalSales / m.orderCount) : 0;
              return (
                <div key={m.marketplace} className="bg-white border rounded-lg p-4 shadow-sm">
                  <div className="font-semibold text-gray-800">{m.marketplace || "—"}</div>
                  <div className="text-sm text-gray-500 mt-1">Sipariş: {m.orderCount || 0}</div>
                  <div className="text-lg font-bold text-orange-600 mt-1">
                    {(m.totalSales || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Ort. sipariş: {ortSiparis.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</div>
                  <div className="text-xs text-red-600 mt-0.5">Komisyon: {(m.commission || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</div>
                </div>
              );
            })}
          </div>

          {/* Komisyon özeti + Platform dağılımı grafik */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-900 mb-1">Toplam Komisyon</h3>
              <p className="text-2xl font-bold text-red-700">
                {(data.marketplaceStats || []).reduce((s, m) => s + (m.commission || 0), 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
              </p>
            </div>
            <div className="lg:col-span-2 bg-white border rounded-lg p-4 shadow-sm">
              <h3 className="font-semibold mb-3">Platform Ciro Dağılımı</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={(data.marketplaceStats || []).map((m) => ({ name: m.marketplace || "—", value: m.totalSales || 0 }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} %${(percent * 100).toFixed(0)}`}
                  >
                    {(data.marketplaceStats || []).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `${Number(v).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar grafik: platform bazlı ciro */}
          {(data.marketplaceStats || []).length > 0 && (
            <div className="bg-white border rounded-lg p-4 shadow-sm mb-6">
              <h3 className="font-semibold mb-3">Pazaryeri Bazlı Satış (₺)</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={(data.marketplaceStats || []).map((m) => ({ platform: m.marketplace || "—", satis: m.totalSales || 0, komisyon: m.commission || 0 }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="platform" />
                  <YAxis />
                  <Tooltip formatter={(v) => `${Number(v).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`} />
                  <Bar dataKey="satis" name="Satış" fill="#FF6600" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="komisyon" name="Komisyon" fill="#dc2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="bg-white border rounded-lg overflow-hidden shadow-sm mb-6">
            <h2 className="px-4 py-3 font-semibold border-b">Günlük Satışlar</h2>
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2">Tarih</th>
                    <th className="text-right px-4 py-2">Adet</th>
                    <th className="text-right px-4 py-2">Tutar (₺)</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.dailyStats || [])
                    .sort((a, b) => (a.date > b.date ? -1 : 1))
                    .map((d) => (
                      <tr key={d.date} className="border-t">
                        <td className="px-4 py-2">{d.date}</td>
                        <td className="text-right px-4 py-2">{d.count || 0}</td>
                        <td className="text-right px-4 py-2 font-medium">
                          {(d.sales || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
            <h2 className="px-4 py-3 font-semibold border-b">Ürün Bazlı (İlk 50)</h2>
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2">Ürün</th>
                    <th className="text-left px-4 py-2">Pazaryeri</th>
                    <th className="text-right px-4 py-2">Adet</th>
                    <th className="text-right px-4 py-2">Tutar (₺)</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.productStats || [])
                    .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
                    .slice(0, 50)
                    .map((p, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-4 py-2">{p.name || "—"}</td>
                        <td className="px-4 py-2">{p.marketplace || "—"}</td>
                        <td className="text-right px-4 py-2">{p.quantity || 0}</td>
                        <td className="text-right px-4 py-2 font-medium">
                          {(p.revenue || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
