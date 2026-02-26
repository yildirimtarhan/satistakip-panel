import React from 'react';
import { OrderStatusBadge } from './OrderStatusBadge';

export function OrderCard({ order, onDetailClick }) {
  const formatDate = (dateString) => {
    if (!dateString || dateString === 'Invalid Date') return '-';
    try {
      // N11 format: "07/09/2021 05:18"
      const parts = dateString.split(' ');
      const dateParts = parts[0].split('/');
      const timePart = parts[1] || '';
      
      if (dateParts.length === 3) {
        const day = dateParts[0];
        const month = dateParts[1];
        const year = dateParts[2];
        const date = new Date(`${year}-${month}-${day}T${timePart || '00:00'}`);
        if (!isNaN(date.getTime())) {
          return date.toLocaleString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      }
      return dateString;
    } catch {
      return dateString || '-';
    }
  };

  const formatPrice = (price) => {
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice === 0) return '-';
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(numPrice);
  };

  // Detaylı verileri al
  const orderNumber = order.orderNumber || order.id;
  const createDate = order.createDate;
  
  // Müşteri bilgisi (detaydan gelir)
  const buyer = order.buyer || {};
  const recipient = order.recipient || {};
  const buyerName = buyer.fullName || recipient.fullName || '-';
  const buyerEmail = buyer.email || recipient.email || '-';
  const buyerPhone = buyer.gsm || recipient.gsm || buyer.phone || '-';
  
  // Adres bilgisi
  const shippingAddress = order.shippingAddress || {};
  const addressText = shippingAddress.address || '-';
  const city = shippingAddress.city || '-';
  
  // Tutar bilgisi (detaydan gelir)
  const totalAmount = order.totalAmount || order.paymentAmount || order.amount;
  const productPrice = order.productPrice;
  const shipmentPrice = order.shipmentPrice;
  const discount = order.discount;
  
  // Ürün bilgisi
  const itemCount = order.itemCount || 
                   order.orderItemList?.orderItem?.length || 
                   order.orderItems?.length || 
                   0;
  
  // Durum
  const status = order.status;

  return (
    <div className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-lg text-gray-800">Sipariş #{orderNumber}</h3>
          <p className="text-sm text-gray-500">{formatDate(createDate)}</p>
        </div>
        <OrderStatusBadge status={status} />
      </div>

      {/* Müşteri ve Tutar */}
      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
        <div>
          <p className="text-gray-600 text-xs uppercase tracking-wide">Müşteri</p>
          <p className="font-medium text-gray-900">{buyerName}</p>
          <p className="text-gray-500 text-xs">{buyerEmail}</p>
          <p className="text-gray-500 text-xs">{buyerPhone}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-600 text-xs uppercase tracking-wide">Toplam Tutar</p>
          <p className="font-bold text-xl text-green-600">{formatPrice(totalAmount)}</p>
          {productPrice && (
            <p className="text-gray-500 text-xs">Ürün: {formatPrice(productPrice)}</p>
          )}
          {shipmentPrice > 0 && (
            <p className="text-gray-500 text-xs">Kargo: {formatPrice(shipmentPrice)}</p>
          )}
          {discount > 0 && (
            <p className="text-red-500 text-xs">İndirim: -{formatPrice(discount)}</p>
          )}
        </div>
      </div>

      {/* Adres */}
      {addressText !== '-' && (
        <div className="bg-gray-50 rounded p-2 mb-3 text-xs">
          <p className="text-gray-600 font-medium">Teslimat Adresi:</p>
          <p className="text-gray-800">{addressText}</p>
          <p className="text-gray-600">{city}</p>
        </div>
      )}

      {/* Footer */}
      <div className="border-t pt-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
            {itemCount} ürün
          </span>
          {order.paymentType === 1 && (
            <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">
              Kredi Kartı
            </span>
          )}
          {order.paymentType === 2 && (
            <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded">
              Havale/EFT
            </span>
          )}
        </div>
        <button
          onClick={onDetailClick}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
        >
          Detayları Gör →
        </button>
      </div>
    </div>
  );
}