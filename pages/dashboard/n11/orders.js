import React, { useState } from 'react';
import { useN11Orders } from '@/hooks/useN11Orders';
import { OrderCard } from '@/components/n11/OrderCard';           // ❌ dashboard/n11 değil
import { OrderStatusBadge } from '@/components/n11/OrderStatusBadge'; // ❌ dashboard/n11 değil
import { useToast } from '@/hooks/useToast';

function FilterBar({ filters = {}, onFilterChange, onSync, syncing }) {
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

        <div className="flex gap-2">
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
            onClick={onSync}
            disabled={syncing}
            className={`px-4 py-2 rounded ${syncing ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 text-white'}`}
          >
            {syncing ? 'Senkronize Ediliyor...' : '🔄 Senkronize Et'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function N11OrdersPage() {
  const [filters, setFilters] = useState({ search: '', status: '' });
  const { orders, loading, error, pagination, fetchOrders, syncOrders, setPage } = useN11Orders(1, 20);
  const { showToast } = useToast();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try { await syncOrders(); } finally { setSyncing(false); }
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
      
      <FilterBar filters={filters} onFilterChange={handleFilterChange} onSync={handleSync} syncing={syncing} />

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          <div className="grid gap-4">
            {orders.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg">Henüz sipariş bulunmuyor</p>
                <p className="text-sm mt-2">Siparişleri çekmek için &quot;Senkronize Et&quot; butonuna tıklayın</p>
              </div>
            ) : (
              orders.map((order) => (
                <OrderCard key={order.orderNumber} order={order} onDetailClick={() => console.log('Detay:', order)} />
              ))
            )}
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button onClick={() => setPage(pagination.currentPage - 1)} disabled={pagination.currentPage === 1} className="px-3 py-1 border rounded disabled:opacity-50">← Önceki</button>
              <span className="px-3 py-1">Sayfa {pagination.currentPage} / {pagination.totalPages}</span>
              <button onClick={() => setPage(pagination.currentPage + 1)} disabled={pagination.currentPage === pagination.totalPages} className="px-3 py-1 border rounded disabled:opacity-50">Sonraki →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}