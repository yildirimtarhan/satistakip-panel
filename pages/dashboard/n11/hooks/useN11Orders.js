import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/useToast';

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
  const { showToast } = useToast();

  // Token'ı localStorage veya cookie'den al
  const getToken = () => {
    // Mevcut sisteminize göre token'ı buradan alın
    // Örnek: localStorage, cookie, veya context
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token') || 
             localStorage.getItem('accessToken') ||
             document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, "$1");
    }
    return null;
  };

  const fetchOrders = useCallback(async (page = pagination.currentPage, status = '') => {
    setLoading(true);
    setError(null);

    try {
      const token = getToken();
      
      const response = await fetch(
        `/api/n11/orders?page=${page}&size=${pageSize}&status=${status}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Siparişler alınamadı');
      }

      setOrders(data.data || []);
      setPagination(prev => ({
        ...prev,
        currentPage: page,
        totalCount: data.pagination?.totalCount || 0,
        totalPages: data.pagination?.totalPages || 1
      }));
      
    } catch (err) {
      console.error('Fetch orders error:', err);
      setError(err.message);
      showToast({
        type: 'error',
        message: err.message
      });
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
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dateRange)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Senkronizasyon başarısız');
      }

      showToast({
        type: 'success',
        message: data.message || 'Senkronizasyon tamamlandı'
      });

      await fetchOrders();
      
      return data;
      
    } catch (err) {
      showToast({
        type: 'error',
        message: err.message
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getOrderDetail = async (orderNumber) => {
    try {
      const token = getToken();
      
      const response = await fetch(`/api/n11/orders/${orderNumber}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sipariş detayı alınamadı');
      }

      return data.data;
    } catch (err) {
      showToast({
        type: 'error',
        message: err.message
      });
      return null;
    }
  };

  const setPage = useCallback((page) => {
    fetchOrders(page);
  }, [fetchOrders]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    loading,
    error,
    pagination,
    fetchOrders,
    syncOrders,
    getOrderDetail,
    setPage
  };
};