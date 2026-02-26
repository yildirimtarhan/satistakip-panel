// components/OrderCard.jsx
import React from "react";
import OrderStatusBadge from "./OrderStatusBadge";
import { formatCurrency, formatDate } from "@/utils/formatters";

export default function OrderCard({ order, onClick }) {
  return (
    <div 
      onClick={onClick}
      className="bg-white border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
            {order.orderNumber}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatDate(order.createdAt)}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <span className="text-gray-400">👤</span>
          <span className="truncate">{order.buyer?.fullName || "İsimsiz Müşteri"}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <span className="text-gray-400">📞</span>
          <span>{order.buyer?.gsm || "-"}</span>
        </div>

        {order.shipmentCompany && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="text-gray-400">🚚</span>
            <span className="truncate">{order.shipmentCompany}</span>
            {order.trackingNumber && (
              <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                {order.trackingNumber}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t flex items-center justify-between">
        <div className="text-xs text-gray-500">
          {order.itemCount} ürün · {order.totalQuantity} adet
          {order.hasCari && (
            <span className="ml-2 text-green-600">✓ Cari</span>
          )}
        </div>
        <div className="font-bold text-gray-900">
          {formatCurrency(order.totalPrice)}
        </div>
      </div>
    </div>
  );
}