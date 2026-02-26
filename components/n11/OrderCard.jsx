import React from 'react';
import { OrderStatusBadge } from './OrderStatusBadge';

export function OrderCard({ order, onDetailClick }) {
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('tr-TR');
  };

  const formatPrice = (price) => {
    if (!price) return '0,00 ₺';
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(price);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-lg">Sipariş #{order.orderNumber}</h3>
          <p className="text-sm text-gray-500">{formatDate(order.createDate)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
        <div>
          <p className="text-gray-600">Müşteri:</p>
          <p className="font-medium">{order.buyer?.fullName || '-'}</p>
          <p className="text-gray-500">{order.buyer?.email || '-'}</p>
        </div>
        <div>
          <p className="text-gray-600">Tutar:</p>
          <p className="font-bold text-lg text-green-600">{formatPrice(order.totalAmount)}</p>
        </div>
      </div>

      <div className="border-t pt-3">
        <p className="text-sm text-gray-600 mb-2">
          Ürün sayısı: {order.itemCount || order.orderItemList?.orderItem?.length || 0}
        </p>
        <button onClick={onDetailClick} className="text-blue-500 hover:text-blue-700 text-sm font-medium">
          Detayları Gör →
        </button>
      </div>
    </div>
  );
}