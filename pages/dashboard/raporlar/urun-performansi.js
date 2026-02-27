import { useState, useEffect } from "react";
import { Package, TrendingUp, DollarSign, Filter } from "lucide-react";

export default function UrunPerformansiPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState("revenue"); // revenue | quantity
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

  const productStats = Array.isArray(data?.productStats) ? data.productStats : [];
  const sorted = [...productStats].sort((a, b) => {
    if (sortBy === "quantity") return (b.quantity || 0) - (a.quantity || 0);
    return (b.revenue || 0) - (a.revenue || 0);
  });
  const enYuksekGelir = [...productStats].sort((a, b) => (b.revenue || 0) - (a.revenue || 0)).slice(0, 10);
  const yavasHareket = [...productStats].sort((a, b) => (a.quantity || 0) - (b.quantity || 0)).filter(p => (p.quantity || 0) <= 5).slice(0, 15);

  const totalRevenue = productStats.reduce((s, p) => s + (p.revenue || 0), 0);
  const totalQuantity = productStats.reduce((s, p) => s + (p.quantity || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Ürün Performansı</h1>
      <p className="text-gray-500 mb-6">En çok satan ve gelir getiren ürünler</p>

      <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-wrap gap-4 items-end">
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
        <div>
          <label className="block text-sm text-gray-600 mb-1">Sırala</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="revenue">Gelire göre (yüksek → düşük)</option>
            <option value="quantity">Adete göre (çok → az)</option>
          </select>
        </div>
        <button
          type="button"
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
        >
          <Filter size={18} />
          Filtrele
        </button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white border rounded-lg p-4 shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-50">
                <DollarSign className="text-blue-600" size={28} />
              </div>
              <div>
                <div className="text-sm text-gray-500">Toplam Gelir</div>
                <div className="text-xl font-bold text-gray-900">
                  {totalRevenue.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
                </div>
              </div>
            </div>
            <div className="bg-white border rounded-lg p-4 shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-50">
                <Package className="text-green-600" size={28} />
              </div>
              <div>
                <div className="text-sm text-gray-500">Toplam Satılan Adet</div>
                <div className="text-xl font-bold text-gray-900">
                  {totalQuantity.toLocaleString("tr-TR")}
                </div>
              </div>
          </div>
        </div>

          {/* En yüksek gelir getiren (ilk 10) */}
          {enYuksekGelir.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg overflow-hidden mb-6">
              <h2 className="px-4 py-3 font-semibold text-green-900 border-b border-green-200">En yüksek gelir getiren ürünler (ilk 10)</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-green-100">
                    <tr>
                      <th className="text-left px-4 py-2">#</th>
                      <th className="text-left px-4 py-2">Ürün</th>
                      <th className="text-left px-4 py-2">Pazaryeri</th>
                      <th className="text-right px-4 py-2">Adet</th>
                      <th className="text-right px-4 py-2">Gelir (₺)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enYuksekGelir.map((p, i) => (
                      <tr key={i} className="border-t border-green-100">
                        <td className="px-4 py-2 text-gray-500">{i + 1}</td>
                        <td className="px-4 py-2 font-medium">{p.name || "—"}</td>
                        <td className="px-4 py-2">{p.marketplace || "—"}</td>
                        <td className="text-right px-4 py-2">{p.quantity ?? 0}</td>
                        <td className="text-right px-4 py-2 font-semibold text-green-700">{(p.revenue ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Yavaş hareket edenler (az satan) */}
          {yavasHareket.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg overflow-hidden mb-6">
              <h2 className="px-4 py-3 font-semibold text-amber-900 border-b border-amber-200">Yavaş hareket eden ürünler (az satan, adet ≤ 5)</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-amber-100">
                    <tr>
                      <th className="text-left px-4 py-2">Ürün</th>
                      <th className="text-left px-4 py-2">Pazaryeri</th>
                      <th className="text-right px-4 py-2">Adet</th>
                      <th className="text-right px-4 py-2">Gelir (₺)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yavasHareket.map((p, i) => (
                      <tr key={i} className="border-t border-amber-100">
                        <td className="px-4 py-2 font-medium">{p.name || "—"}</td>
                        <td className="px-4 py-2">{p.marketplace || "—"}</td>
                        <td className="text-right px-4 py-2">{p.quantity ?? 0}</td>
                        <td className="text-right px-4 py-2">{(p.revenue ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
            <h2 className="px-4 py-3 font-semibold border-b flex items-center gap-2">
              <TrendingUp size={20} />
              Ürün listesi
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3">#</th>
                    <th className="text-left px-4 py-3">Ürün</th>
                    <th className="text-left px-4 py-3">Pazaryeri</th>
                    <th className="text-right px-4 py-3">Adet</th>
                    <th className="text-right px-4 py-3">Gelir (₺)</th>
                    <th className="text-right px-4 py-3">Ort. Birim Fiyat</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((p, i) => (
                    <tr key={i} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                      <td className="px-4 py-3 font-medium">{p.name || "—"}</td>
                      <td className="px-4 py-3">{p.marketplace || "—"}</td>
                      <td className="text-right px-4 py-3">{p.quantity ?? 0}</td>
                      <td className="text-right px-4 py-3 font-medium">
                        {(p.revenue ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
                      </td>
                      <td className="text-right px-4 py-3 text-gray-600">
                        {p.quantity
                          ? ((p.revenue ?? 0) / p.quantity).toLocaleString("tr-TR", { minimumFractionDigits: 2 })
                          : "—"}{" "}
                        ₺
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sorted.length === 0 && (
              <div className="text-center py-12 text-gray-500">Seçilen dönemde ürün satışı bulunamadı.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
