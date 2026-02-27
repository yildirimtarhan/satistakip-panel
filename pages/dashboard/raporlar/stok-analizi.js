import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line 
} from 'recharts';
import { 
  Package, AlertTriangle, TrendingUp, TrendingDown, 
  DollarSign, Filter, Download, Search 
} from 'lucide-react';
import { format, subDays } from 'date-fns';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6B6B'];

export default function StokAnalizi() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    category: '',
    lowStock: 'false'
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams(filters).toString();
      const res = await fetch(`/api/reports/stock-analysis?${queryParams}`);
      const result = await res.json();
      if (result.success) setData(result);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center p-8">Yükleniyor...</div>;
  if (!data) return <div>Veri bulunamadı</div>;

  const summary = data.summary || {};
  const criticalStock = Array.isArray(data.criticalStock) ? data.criticalStock : [];
  const topMovingProducts = Array.isArray(data.topMovingProducts) ? data.topMovingProducts : [];
  const stockAging = Array.isArray(data.stockAging) ? data.stockAging : [];
  const slowMovingProducts = Array.isArray(data.slowMovingProducts) ? data.slowMovingProducts : [];
  const products = Array.isArray(data.products) ? data.products : [];
  const categoryDistribution = Array.isArray(data.categoryDistribution) ? data.categoryDistribution : [];
  const dailyMovements = Array.isArray(data.dailyMovements) ? data.dailyMovements : [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Stok Analizi</h1>
        <p className="text-gray-500 mt-1">Stok hareketleri, değerleme ve kritik stok raporları</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-4">
        <input
          type="date"
          value={filters.startDate}
          onChange={(e) => setFilters({...filters, startDate: e.target.value})}
          className="border rounded-lg px-3 py-2"
        />
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => setFilters({...filters, endDate: e.target.value})}
          className="border rounded-lg px-3 py-2"
        />
        <select
          value={filters.category}
          onChange={(e) => setFilters({...filters, category: e.target.value})}
          className="border rounded-lg px-3 py-2"
        >
          <option value="">Tüm Kategoriler</option>
          {categoryDistribution.map(cat => (
            <option key={cat._id} value={cat._id}>{cat._id}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            checked={filters.lowStock === 'true'}
            onChange={(e) => setFilters({...filters, lowStock: e.target.checked ? 'true' : 'false'})}
            className="rounded text-red-600 focus:ring-red-500"
          />
          <span className="text-sm">Sadece Kritik Stoklar</span>
        </label>
        <button 
          onClick={fetchData}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Filter size={20} />
          Filtrele
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <KPICard 
          title="Toplam Stok Değeri"
          value={`₺${(summary.toplamStokDegeri ?? 0).toLocaleString()}`}
          icon={<DollarSign className="text-blue-600" size={24} />}
          color="blue"
        />
        <KPICard 
          title="Potansiyel Gelir"
          value={`₺${(summary.toplamPotansiyelGelir ?? 0).toLocaleString()}`}
          icon={<TrendingUp className="text-green-600" size={24} />}
          color="green"
        />
        <KPICard 
          title="Kritik Stok Sayısı"
          value={summary.kritikStokSayisi ?? 0}
          alert={(summary.kritikStokSayisi ?? 0) > 0}
          icon={<AlertTriangle className="text-red-600" size={24} />}
          color="red"
        />
        <KPICard 
          title="Toplam Ürün Çeşidi"
          value={(summary.toplamUrun ?? 0).toLocaleString()}
          icon={<Package className="text-purple-600" size={24} />}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Category Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Kategori Dağılımı</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="stokDegeri"
                nameKey="_id"
                label
              >
                {categoryDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `₺${value.toLocaleString()}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Daily Movements */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Günlük Stok Hareketleri</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyMovements}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="_id.tarih" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="toplamMiktar" name="Miktar" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Critical Stock Alert */}
      {criticalStock.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="text-red-600" />
            <h3 className="text-lg font-semibold text-red-900">Kritik Stok Uyarısı</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-red-100">
                <tr>
                  <th className="px-4 py-2 text-left text-red-900">Ürün</th>
                  <th className="px-4 py-2 text-left text-red-900">SKU</th>
                  <th className="px-4 py-2 text-center text-red-900">Mevcut Stok</th>
                  <th className="px-4 py-2 text-center text-red-900">Min. Seviye</th>
                  <th className="px-4 py-2 text-center text-red-900">Durum</th>
                </tr>
              </thead>
              <tbody>
                {criticalStock.map((item) => (
                  <tr key={item._id} className="border-b border-red-100">
                    <td className="px-4 py-3 font-medium">{item.urunAdi ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{item.sku ?? "—"}</td>
                    <td className="px-4 py-3 text-center font-bold text-red-600">{item.stokMiktari ?? 0}</td>
                    <td className="px-4 py-3 text-center">{item.minStokSeviyesi ?? 0}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-1 bg-red-200 text-red-800 rounded-full text-xs font-semibold">
                        Tükenmek Üzere
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Moving Products */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">En Çok Satan Ürünler</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">Ürün</th>
                <th className="px-6 py-3 text-right">Toplam Çıkış</th>
                <th className="px-6 py-3 text-right">Performans</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {topMovingProducts.map((item, idx) => {
                const maxCikis = topMovingProducts[0]?.toplamCikis || 1;
                const pct = maxCikis > 0 ? (item.toplamCikis / maxCikis) * 100 : 0;
                return (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium">{item.urun?.urunAdi ?? "—"}</div>
                      <div className="text-sm text-gray-500">{item.urun?.sku ?? "—"}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold">{item.toplamCikis ?? 0}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="w-full bg-gray-200 rounded-full h-2 max-w-[100px] ml-auto">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stok Yaşlandırma */}
      {stockAging.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold">Stok Yaşlandırma</h3>
            <p className="text-sm text-gray-500 mt-1">En uzun süredir stokta olan ürünler (ilk 30)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Ürün</th>
                  <th className="px-4 py-2 text-left">SKU</th>
                  <th className="px-4 py-2 text-center">Stok</th>
                  <th className="px-4 py-2 text-right">Stok Değeri</th>
                  <th className="px-4 py-2 text-right">Gün Stokta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stockAging.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{item.urunAdi ?? "—"}</td>
                    <td className="px-4 py-2 text-gray-600">{item.sku ?? "—"}</td>
                    <td className="px-4 py-2 text-center">{item.stokMiktari ?? 0}</td>
                    <td className="px-4 py-2 text-right">₺{(item.stokDegeri ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-2 text-right text-amber-600">{item.gunStokta ?? 0} gün</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Yavaş Hareket Eden Ürünler */}
      {slowMovingProducts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-amber-200">
            <h3 className="text-lg font-semibold text-amber-900">Yavaş Hareket Eden Ürünler</h3>
            <p className="text-sm text-amber-700 mt-1">Stok var ancak son dönemde çıkış hareketi olmayan ürünler</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-amber-100">
                <tr>
                  <th className="px-4 py-2 text-left">Ürün</th>
                  <th className="px-4 py-2 text-left">SKU</th>
                  <th className="px-4 py-2 text-center">Stok</th>
                  <th className="px-4 py-2 text-right">Stok Değeri</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {slowMovingProducts.map((item) => (
                  <tr key={item._id} className="hover:bg-amber-50">
                    <td className="px-4 py-2 font-medium">{item.urunAdi ?? "—"}</td>
                    <td className="px-4 py-2 text-gray-600">{item.sku ?? "—"}</td>
                    <td className="px-4 py-2 text-center">{item.stokMiktari ?? 0}</td>
                    <td className="px-4 py-2 text-right">₺{(item.stokDegeri ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Products Detail Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">Stok Detayları</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Ürün ara..." 
              className="pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">Ürün</th>
                <th className="px-6 py-3 text-left">Kategori</th>
                <th className="px-6 py-3 text-center">Stok</th>
                <th className="px-6 py-3 text-right">Alış Fiyatı</th>
                <th className="px-6 py-3 text-right">Satış Fiyatı</th>
                <th className="px-6 py-3 text-right">Stok Değeri</th>
                <th className="px-6 py-3 text-right">Kar Marjı</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map((item) => {
                const stok = item.stokMiktari ?? 0;
                const minStok = item.minStokSeviyesi ?? 0;
                const isLow = minStok > 0 ? stok <= minStok : stok <= 0;
                return (
                  <tr key={item._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium">{item.urunAdi ?? item.sku ?? "—"}</div>
                      <div className="text-sm text-gray-500">{item.sku ?? "—"}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.kategori ?? "—"}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        isLow ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                      }`}>
                        {stok}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">₺{(item.alisFiyati ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 text-right">₺{(item.satisFiyati ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 text-right font-medium">₺{(item.stokDegeri ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 text-right text-green-600">₺{(item.karMarji ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// KPICard Component (same as above with alert prop)
function KPICard({ title, value, alert, icon, color }) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    purple: 'bg-purple-50 border-purple-200',
    red: alert ? 'bg-red-50 border-red-200 animate-pulse' : 'bg-red-50 border-red-200'
  };

  return (
    <div className={`${colorClasses[color]} border rounded-xl p-6`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        </div>
        <div className="p-3 bg-white rounded-lg shadow-sm">
          {icon}
        </div>
      </div>
    </div>
  );
}