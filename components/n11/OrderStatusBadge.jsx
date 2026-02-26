import React from 'react';

const statusConfig = {
  // String versiyonlar
  'New': { label: 'Yeni', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  'Approved': { label: 'Onaylandı', color: 'bg-green-100 text-green-800 border-green-200' },
  'Rejected': { label: 'Reddedildi', color: 'bg-red-100 text-red-800 border-red-200' },
  'Shipped': { label: 'Kargoya Verildi', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  'Delivered': { label: 'Teslim Edildi', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  'Completed': { label: 'Tamamlandı', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  'Claimed': { label: 'Şikayet Var', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  // Sayısal versiyonlar (N11 status kodları)
  0: { label: 'Yeni', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  1: { label: 'Onaylandı', color: 'bg-green-100 text-green-800 border-green-200' },
  2: { label: 'Reddedildi', color: 'bg-red-100 text-red-800 border-red-200' },
  3: { label: 'Kargoya Verildi', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  4: { label: 'Teslim Edildi', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  5: { label: 'Tamamlandı', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  6: { label: 'Şikayet Var', color: 'bg-orange-100 text-orange-800 border-orange-200' },
};

export function OrderStatusBadge({ status }) {
  const config = statusConfig[status] || { 
    label: status?.toString() || 'Bilinmiyor', 
    color: 'bg-gray-100 text-gray-800 border-gray-200' 
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${config.color}`}>
      {config.label}
    </span>
  );
}