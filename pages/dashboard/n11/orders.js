import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useN11Orders } from '@/hooks/useN11Orders';
import { OrderCard } from '@/components/n11/OrderCard';
import { FaturaModal } from '@/components/pazaryeri/FaturaModal';

const N11_STATUS_MAP = { New: "Yeni", Approved: "Onaylandı", Rejected: "Reddedildi", Shipped: "Kargoda", Delivered: "Teslim", Completed: "Tamamlandı" };

function FilterBar({ filters = {}, onFilterChange, onSync, syncing, onFixCariNames, fixingCariNames, viewMode = 'table', onViewModeChange }) {
  const [localSearch, setLocalSearch] = useState(filters?.search || '');
  
  const handleSearch = (e) => {
    e.preventDefault();
    onFilterChange({ ...filters, search: localSearch });
  };

  const handleStatusChange = (status) => {
    onFilterChange({ ...filters, status });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <input
            type="text"
            placeholder="Sipariş no, müşteri adı..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="border rounded px-3 py-2 flex-1"
          />
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Ara</button>
        </form>

        <div className="flex flex-wrap gap-2 items-center">
          <select 
            value={filters?.status || ''}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="">Tüm Durumlar</option>
            <option value="New">Yeni</option>
            <option value="Approved">Onaylandı</option>
            <option value="Rejected">Reddedildi</option>
            <option value="Shipped">Kargoya Verildi</option>
            <option value="Delivered">Teslim Edildi</option>
            <option value="Completed">Tamamlandı</option>
          </select>

          <button
            onClick={onFixCariNames}
            disabled={fixingCariNames}
            title="Carideki 'N11 Müşteri' kayıtlarını, bağlı siparişlerdeki adla günceller"
            className={`px-3 py-2 rounded text-sm ${fixingCariNames ? 'bg-gray-400 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-600 text-white'}`}
          >
            {fixingCariNames ? 'Düzeltiliyor...' : '📝 Cari İsimlerini Düzelt'}
          </button>

          <button
            onClick={onSync}
            disabled={syncing}
            className={`px-4 py-2 rounded ${syncing ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 text-white'}`}
          >
            {syncing ? 'Senkronize Ediliyor...' : '🔄 Senkronize Et'}
          </button>

          <div className="flex gap-2 border-l pl-4">
            <button type="button" onClick={() => onViewModeChange?.('card')} className={`px-3 py-2 rounded text-sm ${viewMode === 'card' ? 'bg-orange-500 text-white' : 'bg-gray-100'}`}>Kart</button>
            <button type="button" onClick={() => onViewModeChange?.('table')} className={`px-3 py-2 rounded text-sm ${viewMode === 'table' ? 'bg-orange-500 text-white' : 'bg-gray-100'}`}>Tablo</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function N11OrdersPage() {
  const router = useRouter();
  const [filters, setFilters] = useState({ search: '', status: '' });
  const [viewMode, setViewMode] = useState('table');
  const { orders, loading, error, pagination, fetchOrders, syncOrders, setPage } = useN11Orders(1, 20);
  const [syncing, setSyncing] = useState(false);
  const [fixingCariNames, setFixingCariNames] = useState(false);
  const [erpLoading, setErpLoading] = useState(false);
  const [faturaOrderNumber, setFaturaOrderNumber] = useState(null);

  const handleSync = async () => {
    setSyncing(true);
    try { await syncOrders(); } finally { setSyncing(false); }
  };

  const handleFixCariNames = async () => {
    setFixingCariNames(true);
    try {
      const token = typeof window !== 'undefined' && (localStorage.getItem('token') || localStorage.getItem('accessToken') || '');
      const res = await fetch('/api/n11/orders/fix-cari-names', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'İşlem başarısız');
      alert(data.message + (data.updated ? ` (${data.updated} cari güncellendi)` : ''));
    } catch (e) {
      alert(e.message || 'Cari isimleri düzeltilirken hata oluştu');
    } finally {
      setFixingCariNames(false);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    fetchOrders(1, newFilters.status);
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <h3 className="font-bold">Hata Oluştu</h3>
          <p>{error}</p>
          <button onClick={() => fetchOrders()} className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">Tekrar Dene</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">N11 Siparişleri</h1>
      
      <FilterBar filters={filters} onFilterChange={handleFilterChange} onSync={handleSync} syncing={syncing} onFixCariNames={handleFixCariNames} fixingCariNames={fixingCariNames} viewMode={viewMode} onViewModeChange={setViewMode} />

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {orders.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">Henüz sipariş bulunmuyor</p>
              <p className="text-sm mt-2">Siparişleri çekmek için &quot;Senkronize Et&quot; butonuna tıklayın</p>
            </div>
          ) : viewMode === 'table' ? (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-slate-700">Sipariş no</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-700">Durum</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-700">Son güncelleme</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-700">Kargo</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-700">Etiket</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-700">ERP</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-700">Fatura</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-700">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => {
                      const no = order.orderNumber || order.id;
                      const status = order.status || '—';
                      const statusLabel = N11_STATUS_MAP[status] || status;
                      const date = order.createDate || order.lastStatusUpdateDate || order.updatedAt;
                      const trackingNumber = order.cargoSenderNumber || order.trackingNumber;
                      const trackingUrl = trackingNumber ? `https://www.google.com/search?q=${encodeURIComponent(trackingNumber)}+kargo+takip` : null;
                      return (
                        <tr key={no} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono">{no}</td>
                          <td className="px-4 py-3"><span className="inline-block px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800">{statusLabel}</span></td>
                          <td className="px-4 py-3 text-slate-600">{date ? new Date(date).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</td>
                          <td className="px-4 py-3">
                            {trackingUrl ? <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Takip</a> : '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <a href={`/api/n11/orders/kargo-etiket?orderNumber=${encodeURIComponent(no)}`} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline font-medium">Etiket</a>
                          </td>
                          <td className="px-4 py-3 text-center">{order.erpSaleNo || order.erpPushed ? <span className="text-green-600 font-medium">✓ ERP'de</span> : '—'}</td>
                          <td className="px-4 py-3 text-center">
                            <button type="button" onClick={() => setFaturaOrderNumber(no)} className="text-orange-600 hover:underline text-sm font-medium">E-arşiv fatura</button>
                          </td>
                          <td className="px-4 py-3">
                            <button type="button" onClick={() => router.push(`/dashboard/n11/order/${no}`)} className="text-slate-600 hover:text-orange-600 text-sm">Detay</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {orders.map((order) => (
                <OrderCard
                  key={order.orderNumber || order.id}
                  order={order}
                  onDetailClick={() => {
                    const orderNumber = order.orderNumber || order.id;
                    if (orderNumber) router.push(`/dashboard/n11/order/${orderNumber}`);
                  }}
                />
              ))}
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button onClick={() => setPage(pagination.currentPage - 1)} disabled={pagination.currentPage === 1} className="px-3 py-1 border rounded disabled:opacity-50">← Önceki</button>
              <span className="px-3 py-1">Sayfa {pagination.currentPage} / {pagination.totalPages}</span>
              <button onClick={() => setPage(pagination.currentPage + 1)} disabled={pagination.currentPage === pagination.totalPages} className="px-3 py-1 border rounded disabled:opacity-50">Sonraki →</button>
            </div>
          )}

          <FaturaModal
            open={!!faturaOrderNumber}
            onClose={() => setFaturaOrderNumber(null)}
            orderNumber={faturaOrderNumber}
            marketplace="n11"
            token={typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('accessToken') || '') : ''}
          />
        </>
      )}
    </div>
  );
}