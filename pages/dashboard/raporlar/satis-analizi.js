import { useState, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  AreaChart, Area, ComposedChart
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, 
  Package, Filter, Download, Calendar, Store, Globe 
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { tr } from 'date-fns/locale';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function SatisAnalizi() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    marketplace: '',
    store: '',
    groupBy: 'day'
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams(filters).toString();
      const res = await fetch(`/api/reports/sales-analysis?${queryParams}`);
      const result = await res.json();
      if (result.success) setData(result);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!data || !timeline.length) {
      alert('Dışa aktarılacak veri yok.');
      return;
    }
    const headers = ['Tarih', 'Satış (₺)', 'Komisyon (₺)', 'Kargo (₺)', 'Net Kazanç (₺)', 'İşlem Sayısı'];
    const rows = timeline.map(t => [
      t._id,
      (t.toplamSatis ?? 0).toFixed(2),
      (t.komisyonToplam ?? 0).toFixed(2),
      (t.kargoToplam ?? 0).toFixed(2),
      (t.netKar ?? 0).toFixed(2),
      t.islemSayisi ?? 0
    ]);
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `satis-analizi-${filters.startDate}-${filters.endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex justify-center p-8">Yükleniyor...</div>;
  if (!data) return <div>Veri bulunamadı</div>;

  const summary = data.summary || {};
  const growth = data.growth || {};
  const timeline = Array.isArray(data.timeline) ? data.timeline : [];
  const marketplaceDistribution = Array.isArray(data.marketplaceDistribution) ? data.marketplaceDistribution : [];
  const storeDistribution = Array.isArray(data.storeDistribution) ? data.storeDistribution : [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Satış Analizi</h1>
          <p className="text-gray-500 mt-1">Detaylı satış performans ve karlılık raporları</p>
        </div>
        <button 
          onClick={exportToExcel}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          <Download size={20} />
          Excel İndir
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="text-gray-400" size={20} />
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({...filters, startDate: e.target.value})}
            className="border rounded-lg px-3 py-2 w-full"
          />
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="text-gray-400" size={20} />
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({...filters, endDate: e.target.value})}
            className="border rounded-lg px-3 py-2 w-full"
          />
        </div>
        <select
          value={filters.marketplace}
          onChange={(e) => setFilters({...filters, marketplace: e.target.value})}
          className="border rounded-lg px-3 py-2"
        >
          <option value="">Tüm Pazaryerleri</option>
          <option value="trendyol">Trendyol</option>
          <option value="hepsiburada">Hepsiburada</option>
          <option value="n11">N11</option>
          <option value="amazon">Amazon</option>
          <option value="magaza">Mağaza</option>
        </select>
        <select
          value={filters.groupBy}
          onChange={(e) => setFilters({...filters, groupBy: e.target.value})}
          className="border rounded-lg px-3 py-2"
        >
          <option value="day">Günlük</option>
          <option value="month">Aylık</option>
          <option value="marketplace">Pazaryeri</option>
        </select>
        <button 
          onClick={fetchData}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
        >
          <Filter size={20} />
          Filtrele
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <KPICard 
          title="Toplam Ciro"
          value={`₺${(summary.toplamCiro ?? 0).toLocaleString()}`}
          trend={growth.ciro}
          icon={<DollarSign className="text-blue-600" size={24} />}
          color="blue"
        />
        <KPICard 
          title="Net Kar"
          value={`₺${(summary.netKar ?? 0).toLocaleString()}`}
          trend={growth.kar != null ? growth.kar : (summary.karMarji != null ? Number(summary.karMarji) : undefined)}
          subtitle={summary.karMarji != null ? `Kar Marjı: %${summary.karMarji}` : undefined}
          icon={<TrendingUp className="text-green-600" size={24} />}
          color="green"
        />
        <KPICard 
          title="Toplam İşlem"
          value={(summary.toplamIslem ?? 0).toLocaleString()}
          trend={growth.islem}
          icon={<ShoppingCart className="text-purple-600" size={24} />}
          color="purple"
        />
        <KPICard 
          title="Toplam Ürün"
          value={(summary.toplamUrun ?? 0).toLocaleString()}
          icon={<Package className="text-orange-600" size={24} />}
          color="orange"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Sales Timeline */}
        <div className="bg-white p-6 rounded-xl shadow-sm lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Satış Trendi</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="_id" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip formatter={(value) => `₺${value.toLocaleString()}`} />
              <Legend />
              <Bar yAxisId="left" dataKey="toplamSatis" name="Satış" fill="#3B82F6" />
              <Line yAxisId="right" type="monotone" dataKey="netKar" name="Net Kazanç" stroke="#10B981" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Marketplace Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Pazaryeri Dağılımı</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={marketplaceDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({name, percent}) => `${name} %${(percent * 100).toFixed(0)}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="satis"
                nameKey="_id"
              >
                {marketplaceDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `₺${value.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Store Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Mağaza Performansı</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={storeDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="_id" />
              <YAxis />
              <Tooltip formatter={(value) => `₺${value.toLocaleString()}`} />
              <Bar dataKey="satis" fill="#8B5CF6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Detaylı Rapor</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Satış</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Komisyon</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Kargo</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net Kazanç</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {timeline.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{item._id}</td>
                  <td className="px-6 py-4 text-right">₺{item.toplamSatis?.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-red-600">₺{item.komisyonToplam?.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-red-600">₺{item.kargoToplam?.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right font-semibold text-green-600">₺{(item.netKar ?? item.netKazanc)?.toLocaleString()}</td>
                  <td className="px-6 py-4 text-center">{item.islemSayisi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// KPICard Component
function KPICard({ title, value, trend, subtitle, icon, color }) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    purple: 'bg-purple-50 border-purple-200',
    orange: 'bg-orange-50 border-orange-200'
  };

  return (
    <div className={`${colorClasses[color]} border rounded-xl p-6`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              <span>%{Math.abs(trend)}</span>
            </div>
          )}
        </div>
        <div className="p-3 bg-white rounded-lg shadow-sm">
          {icon}
        </div>
      </div>
    </div>
  );
}