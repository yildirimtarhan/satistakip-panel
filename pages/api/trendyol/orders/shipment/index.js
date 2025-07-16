import React, { useEffect, useState } from 'react';

const TrendyolOrders = () => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const fetchOrders = async () => {
      const res = await fetch('/api/trendyol/orders');
      const data = await res.json();
      setOrders(data.content || []);
    };
    fetchOrders();
  }, []);

  const handleShipment = async () => {
    const res = await fetch('/api/trendyol/shipment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderNumber: '10296069785',
        cargoTrackingNumber: '7330024301231809',
        cargoCompanyId: 204, // Trendyol Express örneği
        items: [
          {
            lineItemId: 12345678, // burayı senin gerçek lineItemId verinle değiştireceğiz
            quantity: 1,
          },
        ],
      }),
    });

    const result = await res.json();
    console.log('📦 Shipment response:', result);
    alert(result.message || 'Kargo bildirimi yapıldı.');
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">📦 Trendyol Siparişleri</h1>

      {orders.length === 0 ? (
        <p className="text-gray-500">📭 Henüz sipariş bulunmuyor.</p>
      ) : (
        orders.map((order) => (
          <div key={order.id} className="border rounded p-4 mb-4 shadow-sm">
            <p><strong>Sipariş No:</strong> {order.orderNumber}</p>
            <p><strong>Müşteri:</strong> {order.customerFirstName} {order.customerLastName}</p>
            <p><strong>Durum:</strong> {order.status}</p>
            <p><strong>Tutar:</strong> {order.totalPrice} TRY</p>
            <p><strong>Kargo:</strong> {order.cargoTrackingNumber || 'Henüz gönderilmedi'}</p>

            {/* Geçici test butonu */}
            <button
              onClick={handleShipment}
              className="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              📤 Kargoya Ver (Test)
            </button>
          </div>
        ))
      )}
    </div>
  );
};

export default TrendyolOrders;
