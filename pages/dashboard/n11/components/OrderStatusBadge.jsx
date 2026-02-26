import React from 'react';

const statusConfig = {
  'New': { label: 'Yeni', color: 'bg-blue-100 text-blue-800' },
  'Approved': { label: 'Onaylandı', color: 'bg-green-100 text-green-800' },
  'Rejected': { label: 'Reddedildi', color: 'bg-red-100 text-red-800' },
  'Shipped': { label: 'Kargoya Verildi', color: 'bg-purple-100 text-purple-800' },
  'Delivered': { label: 'Teslim Edildi', color: 'bg-indigo-100 text-indigo-800' },
  'Completed': { label: 'Tamamlandı', color: 'bg-gray-100 text-gray-800' },
  'Claimed': { label: 'Şikayet Var', color: 'bg-orange-100 text-orange-800' }
};

export function OrderStatusBadge({ status }) {
  const config = statusConfig[status] || { label: status || 'Bilinmiyor', color: 'bg-gray-100 text-gray-800' };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}