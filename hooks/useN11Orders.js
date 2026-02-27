import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/useToast';

/** Siparişte detay var mı (müşteri adı / tutar) */
function hasDetailedData(order) {
  return !!(
    (order?.buyer?.fullName || order?.recipient || order?.buyerName) ||
    (order?.totalAmount != null && order?.totalAmount !== '') ||
    (order?.orderItemList?.orderItem?.length || order?.orderItemList?.orderItem)
  );
}

export const useN11Orders = (initialPage = 1, pageSize = 20) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: initialPage,
    pageSize,
    totalCount: 0,
    totalPages: 1
  });
  const { toast: showToast } = useToast();
  /** N11 bazen detay döndürmüyor; önceki başarılı yanıttan müşteri/tutar sakla (orderNumber -> detay) */
  const detailCacheRef = useRef({});

  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token') || localStorage.getItem('accessToken') || '';
    }
    return '';
  };

  const fetchOrders = useCallback(async (page = pagination.currentPage, status = '') => {
    setLoading(true);
    setError(null);

    try {
      const token = getToken();
      const response = await fetch(
        `/api/n11/orders?page=${page}&size=${pageSize}&status=${status}`,
        { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.message || 'Siparişler alınamadı');

      const rawList = data.data || [];
      const cache = detailCacheRef.current;

      const merged = rawList.map((order) => {
        const no = String(order?.orderNumber || order?.id || '');
        if (hasDetailedData(order)) {
          cache[no] = {
            buyer: order.buyer,
            recipient: order.recipient,
            buyerName: order.buyerName,
            totalAmount: order.totalAmount,
            orderItemList: order.orderItemList,
            shippingAddress: order.shippingAddress,
            billingAddress: order.billingAddress,
          };
          return order;
        }
        if (cache[no]) {
          return { ...order, ...cache[no] };
        }
        return order;
      });

      setOrders(merged);
      setPagination(prev => ({ ...prev, currentPage: page, totalCount: data.pagination?.totalCount || 0, totalPages: data.pagination?.totalPages || 1 }));
    } catch (err) {
      setError(err.message);
      showToast({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }, [pagination.currentPage, pageSize, showToast]);

  const syncOrders = async (dateRange = {}) => {
    setLoading(true);
    try {
      const token = getToken();
      const response = await fetch('/api/n11/orders/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(dateRange)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Senkronizasyon başarısız');
      }

      showToast({ type: 'success', message: data.message || 'Senkronizasyon tamamlandı' });
      await fetchOrders();
      return data;
    } catch (err) {
      showToast({ type: 'error', message: err.message });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const setPage = useCallback((page) => fetchOrders(page), [fetchOrders]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  return { orders, loading, error, pagination, fetchOrders, syncOrders, setPage };
};