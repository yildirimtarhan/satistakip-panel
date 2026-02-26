// components/OrderStatusBadge.jsx
import React from "react";

const STATUS_CONFIG = {
  "Created": { label: "Oluşturuldu", color: "bg-blue-100 text-blue-700 border-blue-200" },
  "Picking": { label: "Hazırlanıyor", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  "Shipped": { label: "Kargoda", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  "Delivered": { label: "Teslim Edildi", color: "bg-green-100 text-green-700 border-green-200" },
  "Cancelled": { label: "İptal Edildi", color: "bg-red-100 text-red-700 border-red-200" },
  "UnPacked": { label: "Paketlendi", color: "bg-purple-100 text-purple-700 border-purple-200" },
  "UnSupplied": { label: "Tedarik Edilemedi", color: "bg-gray-100 text-gray-600 border-gray-200" }
};

export default function OrderStatusBadge({ status, showDot = true }) {
  const config = STATUS_CONFIG[status] || { 
    label: status || "Bilinmiyor", 
    color: "bg-gray-100 text-gray-600 border-gray-200" 
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.color}`}>
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full ${config.color.split(" ")[0].replace("bg-", "bg-").replace("100", "500")}`} />
      )}
      {config.label}
    </span>
  );
}