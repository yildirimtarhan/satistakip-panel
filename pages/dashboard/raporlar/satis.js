import { useState, useEffect } from "react";
import { useRouter } from "next/router";

export default function SatisRaporu() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    marketplace: "",
    groupBy: "day"
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams(filters).toString();
      
      // Yeni API'yi kullan
      const res = await fetch(`/api/reports/v2/sales-analysis?${params}`);
      const result = await res.json();
      
      if (result.success) {
        setData(result);
      } else {
        console.error("API Error:", result.message);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Satış Analizi Raporu</h1>
      
      {/* Filtreler */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-wrap gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Başlangıç</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({...filters, startDate: e.target.value})}
            className="border rounded px-3 py-2"
          />
        </div>
        
        <div>
          <label className="block text-sm text-gray-600 mb-1">Bitiş</label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({...filters, endDate: e.target.value})}
            className="border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Pazaryeri</label>
          <select
            value={filters.marketplace}
            onChange={(e) => setFilters({...filters, marketplace: e.target.value})}
            className="border rounded px-3 py-2"
          >
            <option value="">Tümü</option>
            <option value="n11">N11</option>
            <option value="hepsiburada">Hepsiburada</option>
            <option value="trendyol">Trendyol</option>
            <option value="magaza">Mağaza</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Gruplama</label>
          <select
            value={filters.groupBy}
            onChange={(e) => setFilters({...filters, groupBy: e.target.value})}
            className="border rounded px-3 py-2"
          >
            <option value="day">Günlük</option>
            <option value="month">Aylık</option>
            <option value="marketplace">Pazaryeri</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={fetchData}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Yükleniyor..." : "Filtrele"}
          </button>
        </div>
      </div>

      {/* Özet Kartlar */}
      {data?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-gray-600">Toplam Ciro</p>
            <p className="text-2xl font-bold text-blue-900">
              ₺{data.summary.toplamCiro.toLocaleString()}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-sm text-gray-600">Toplam İşlem</p>
            <p className="text-2xl font-bold text-green-900">
              {data.summary.toplamIslem.toLocaleString()}
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <p className="text-sm text-gray-600">Toplam Ürün</p>
            <p className="text-2xl font-bold text-purple-900">
              {data.summary.toplamUrun.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Tablo */}
      {data?.timeline && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  {filters.groupBy === "marketplace" ? "Pazaryeri" : "Tarih"}
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Satış</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">İşlem</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Ürün</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Ortalama</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.timeline.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{item._id}</td>
                  <td className="px-4 py-3 text-right">₺{item.toplamSatis?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{item.islemSayisi}</td>
                  <td className="px-4 py-3 text-right">{item.urunAdedi}</td>
                  <td className="px-4 py-3 text-right">₺{Math.round(item.ortalamaSatis || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pazaryeri Dağılımı */}
      {data?.marketplaceDistribution && data.marketplaceDistribution.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4">Pazaryeri Dağılımı</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.marketplaceDistribution.map((mp) => (
              <div key={mp._id} className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-600">{mp._id || "Mağaza"}</p>
                <p className="text-lg font-bold">₺{mp.satis?.toLocaleString()}</p>
                <p className="text-xs text-gray-500">{mp.islem} işlem</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}