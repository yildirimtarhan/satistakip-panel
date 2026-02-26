// pages/dashboard/n11/orders.js
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useN11Orders } from "./hooks/useN11Orders";
import OrderCard from "./components/OrderCard";
import OrderStatusBadge from "./components/OrderStatusBadge";
import { formatDate } from "@/utils/formatters";

// Filtre bileşenleri
function FilterBar({ filters, onFilterChange, onSync, syncing }) {
  const [localSearch, setLocalSearch] = useState(filters.search || "");

  const handleSearch = (e) => {
    e.preventDefault();
    onFilterChange({ search: localSearch });
  };

  return (
    <div className="bg-white border rounded-xl p-4 mb-6 space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        {/* Arama */}
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Sipariş Ara
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Sipariş no, müşteri adı..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
            >
              Ara
            </button>
          </div>
        </form>

        {/* Durum Filtresi */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Durum
          </label>
          <select
            value={filters.status || ""}
            onChange={(e) => onFilterChange({ status: e.target.value || undefined })}
            className="border rounded-lg px-3 py-2 text-sm min-w-[140px]"
          >
            <option value="">Tümü</option>
            <option value="Created">Oluşturuldu</option>
            <option value="Picking">Hazırlanıyor</option>
            <option value="Shipped">Kargoda</option>
            <option value="Delivered">Teslim Edildi</option>
            <option value="Cancelled">İptal Edildi</option>
          </select>
        </div>

        {/* Tarih Filtresi */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Başlangıç
          </label>
          <input
            type="date"
            value={filters.startDate || ""}
            onChange={(e) => onFilterChange({ startDate: e.target.value || undefined })}
            className="border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Bitiş
          </label>
          <input
            type="date"
            value={filters.endDate || ""}
            onChange={(e) => onFilterChange({ endDate: e.target.value || undefined })}
            className="border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {/* Senkronize Butonu */}
        <button
          onClick={onSync}
          disabled={syncing}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center gap-2"
        >
          {syncing ? (
            <>
              <span className="animate-spin">↻</span>
              Senkronize ediliyor...
            </>
          ) : (
            <>
              <span>↻</span>
              N11'den Çek
            </>
          )}
        </button>
      </div>

      {/* Aktif Filtreler */}
      {(filters.status || filters.search || filters.startDate) && (
        <div className="flex flex-wrap gap-2 pt-3 border-t">
          <span className="text-xs text-gray-500">Aktif Filtreler:</span>
          {filters.status && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
              <OrderStatusBadge status={filters.status} showDot={false} />
              <button 
                onClick={() => onFilterChange({ status: undefined })}
                className="hover:text-orange-900"
              >
                ×
              </button>
            </span>
          )}
          {filters.search && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
              Arama: {filters.search}
              <button 
                onClick={() => { onFilterChange({ search: undefined }); setLocalSearch(""); }}
                className="hover:text-gray-900"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// İstatistik Kartları
function StatsCards({ orders }) {
  const stats = {
    total: orders.length,
    new: orders.filter(o => o.status === "Created").length,
    processing: orders.filter(o => o.status === "Picking").length,
    shipped: orders.filter(o => o.status === "Shipped").length,
    totalValue: orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0)
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      {[
        { label: "Toplam", value: stats.total, color: "text-gray-900" },
        { label: "Yeni", value: stats.new, color: "text-blue-600" },
        { label: "Hazırlanıyor", value: stats.processing, color: "text-yellow-600" },
        { label: "Kargoda", value: stats.shipped, color: "text-indigo-600" },
        { label: "Toplam Tutar", value: `₺${stats.totalValue.toLocaleString("tr-TR")}`, color: "text-green-600" },
      ].map((stat, i) => (
        <div key={i} className="bg-white border rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">{stat.label}</p>
          <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
        </div>
      ))}
    </div>
  );
}

// Ana Sayfa Bileşeni
export default function N11OrdersPage() {
  const router = useRouter();
  const {
    orders,
    loading,
    syncing,
    pagination,
    filters,
    fetchOrders,
    syncOrders,
    updateFilters,
    setPage
  } = useN11Orders();

  const handleOrderClick = (orderNumber) => {
    router.push(`/dashboard/n11/order/${orderNumber}`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Başlık */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">N11 Siparişleri</h1>
        <p className="text-sm text-gray-500 mt-1">
          N11 pazaryerinden gelen siparişleri yönetin
        </p>
      </div>

      {/* İstatistikler */}
      <StatsCards orders={orders} />

      {/* Filtreler */}
      <FilterBar 
        filters={filters}
        onFilterChange={updateFilters}
        onSync={syncOrders}
        syncing={syncing}
      />

      {/* Sipariş Listesi */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 bg-white border rounded-xl">
          <p className="text-gray-500 mb-4">Henüz sipariş bulunamadı</p>
          <button
            onClick={syncOrders}
            disabled={syncing}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700"
          >
            N11'den Sipariş Çek
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onClick={() => handleOrderClick(order.orderNumber)}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage(pagination.page - 1)}
                disabled={pagination.page === 0}
                className="px-4 py-2 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                ← Önceki
              </button>
              
              <span className="px-4 py-2 text-sm text-gray-600">
                Sayfa {pagination.page + 1} / {pagination.totalPages}
                <span className="text-gray-400 ml-2">
                  (Toplam {pagination.total} sipariş)
                </span>
              </span>

              <button
                onClick={() => setPage(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages - 1}
                className="px-4 py-2 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                Sonraki →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}