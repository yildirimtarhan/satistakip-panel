import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Area 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, Percent, 
  Calendar, Filter, ArrowUpRight, ArrowDownRight 
} from 'lucide-react';
import { format, subDays } from 'date-fns';

export default function KarZararAnalizi() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: format(subDays(new Date(), 90), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    groupBy: 'monthly'
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams(filters).toString();
      const res = await fetch(`/api/reports/profit-loss?${queryParams}`);
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

  // Combine income and expenses for chart
  const combinedData = data.gelirler.map(gelir => {
    const gider = data.giderler.find(g => g._id === gelir._id) || { alisTutari: 0 };
    return {
      ...gelir,
      alisTutari: gider.alisTutari,
      netDurum: gelir.netKar - gider.alisTutari
    };
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Kar / Zarar Analizi</h1>
        <p className="text-gray-500 mt-1">Detaylı gelir-gider ve karlılık raporları</p>
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
          value={filters.groupBy}
          onChange={(e) => setFilters({...filters, groupBy: e.target.value})}
          className="border rounded-lg px-3 py-2"
        >
          <option value="daily">Günlük</option>
          <option value="monthly">Aylık</option>
        </select>
        <button 
          onClick={fetchData}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Filter size={20} />
          Filtrele
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <SummaryCard 
          title="Toplam Gelir"
          value={data.summary.toplamGelir}
          type="income"
          icon={<TrendingUp className="text-green-600" size={32} />}
        />
        <SummaryCard 
          title="Toplam Gider"
          value={data.summary.toplamGider + data.summary.toplamMaliyet}
          type="expense"
          icon={<TrendingDown className="text-red-600" size={32} />}
        />
        <SummaryCard 
          title="Net Kar"
          value={data.summary.netKar}
          type={data.summary.netKar >= 0 ? 'profit' : 'loss'}
          subValue={`%${data.summary.karMarji} Marj`}
          icon={<DollarSign className={data.summary.netKar >= 0 ? "text-blue-600" : "text-red-600"} size={32} />}
        />
      </div>

      {/* Main Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
        <h3 className="text-lg font-semibold mb-4">Gelir - Gider - Kar Trendi</h3>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={combinedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="_id" />
            <YAxis />
            <Tooltip formatter={(value) => `₺${value?.toLocaleString()}`} />
            <Legend />
            <Bar dataKey="brutSatis" name="Gelir" fill="#10B981" />
            <Bar dataKey="alisTutari" name="Gider" fill="#EF4444" />
            <Line type="monotone" dataKey="netKar" name="Net Kar" stroke="#3B82F6" strokeWidth={3} />
            <Area type="monotone" dataKey="netKar" fill="#3B82F6" fillOpacity={0.1} stroke="none" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Marketplace Profitability */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Pazaryeri Karlılığı</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.marketplaceAnalysis} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="_id" type="category" width={100} />
              <Tooltip formatter={(value) => `₺${value?.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="satis" name="Satış" fill="#3B82F6" />
              <Bar dataKey="netKar" name="Net Kar" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Profit Margin by Marketplace */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Pazaryeri Kar Marjı (%)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.marketplaceAnalysis}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="_id" />
              <YAxis />
              <Tooltip formatter={(value) => `%${value?.toFixed(2)}`} />
              <Bar dataKey="karMarji" name="Kar Marjı" fill="#8B5CF6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Products by Profit */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">En Karlı Ürünler</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">Ürün</th>
                <th className="px-6 py-3 text-right">Toplam Satış</th>
                <th className="px-6 py-3 text-right">Maliyet</th>
                <th className="px-6 py-3 text-right">Net Kar</th>
                <th className="px-6 py-3 text-right">Kar Marjı</th>
                <th className="px-6 py-3 text-center">Performans</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.topProducts?.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium">{item.urun.urunAdi}</div>
                    <div className="text-sm text-gray-500">{item.urun.sku}</div>
                  </td>
                  <td className="px-6 py-4 text-right">₺{item.toplamSatis?.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-red-600">₺{item.toplamMaliyet?.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right font-bold text-green-600">₺{item.netKar?.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      item.karMarji > 30 ? 'bg-green-100 text-green-800' : 
                      item.karMarji > 15 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                    }`}>
                      %{(item.karMarji)?.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${Math.min((item.netKar / data.topProducts[0].netKar) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 text-green-700">Gelir Detayı</h3>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Brüt Satış</span>
              <span className="font-semibold">₺{data.summary.toplamGelir?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-2 border-b text-red-600">
              <span>Komisyon Giderleri</span>
              <span>-₺{data.gelirler.reduce((acc, curr) => acc + (curr.komisyon || 0), 0)?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-2 border-b text-red-600">
              <span>Kargo Giderleri</span>
              <span>-₺{data.gelirler.reduce((acc, curr) => acc + (curr.kargo || 0), 0)?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-2 border-b text-red-600">
              <span>İadeler</span>
              <span>-₺{data.gelirler.reduce((acc, curr) => acc + (curr.iade || 0), 0)?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-3 text-lg font-bold text-green-700">
              <span>Net Gelir</span>
              <span>₺{(data.summary.toplamGelir - data.gelirler.reduce((acc, curr) => acc + (curr.komisyon + curr.kargo + curr.iade || 0), 0))?.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 text-red-700">Maliyet Detayı</h3>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Ürün Maliyeti</span>
              <span className="font-semibold text-red-600">₺{data.summary.toplamMaliyet?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Alış Giderleri</span>
              <span className="font-semibold text-red-600">₺{data.summary.toplamGider?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Operasyonel</span>
              <span className="font-semibold text-red-600">₺0</span>
            </div>
            <div className="flex justify-between py-3 text-lg font-bold text-red-700">
              <span>Toplam Maliyet</span>
              <span>₺{(data.summary.toplamMaliyet + data.summary.toplamGider)?.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, type, subValue, icon }) {
  const colors = {
    income: 'bg-green-50 border-green-200',
    expense: 'bg-red-50 border-red-200',
    profit: 'bg-blue-50 border-blue-200',
    loss: 'bg-red-50 border-red-200'
  };

  const textColors = {
    income: 'text-green-700',
    expense: 'text-red-700',
    profit: 'text-blue-700',
    loss: 'text-red-700'
  };

  return (
    <div className={`${colors[type]} border rounded-xl p-6`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 bg-white rounded-lg shadow-sm`}>
          {icon}
        </div>
        {type === 'income' && <ArrowUpRight className="text-green-600" />}
        {type === 'expense' && <ArrowDownRight className="text-red-600" />}
      </div>
      <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
      <h3 className={`text-3xl font-bold ${textColors[type]}`}>
        ₺{value?.toLocaleString()}
      </h3>
      {subValue && (
        <p className="text-sm text-gray-500 mt-2 font-medium">{subValue}</p>
      )}
    </div>
  );
}