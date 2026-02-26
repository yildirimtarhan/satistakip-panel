// pages/dashboard/n11/hooks/useN11Orders.js
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/useToast";
import Cookies from "js-cookie";

export function useN11Orders(initialFilters = {}) {
  const { toast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 20,
    totalCount: 0,
    pageCount: 1
  });

  const getAuthHeaders = useCallback(() => {
    const token = Cookies.get("token");
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }, []);

  const fetchOrders = useCallback(async (page = 1, customFilters = null) => {
    setLoading(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        size: pagination.pageSize.toString(),
        ...(customFilters || filters)
      });

      const response = await fetch(`/api/n11/orders?${queryParams}`, {
        headers: getAuthHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        // Özel hata mesajları
        if (data.error === 'SETTINGS_NOT_FOUND') {
          throw new Error('N11_API_AYARLARI_EKSIK');
        }
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      if (!data.success) {
        throw new Error(data.message || 'Siparişler alınırken bir hata oluştu');
      }

      setOrders(data.orders || []);
      setPagination(data.pagination || pagination);
      
      return data;
    } catch (err) {
      setError(err.message);
      
      // Özel toast mesajları
      if (err.message === 'N11_API_AYARLARI_EKSIK') {
        toast({
          title: "N11 API Ayarları Eksik",
          description: "Ayarlar > API Bağlantıları sayfasından N11 bilgilerinizi girin.",
          variant: "warning"
        });
      } else {
        toast({
          title: "Hata",
          description: err.message,
          variant: "destructive"
        });
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.pageSize, getAuthHeaders, toast]);

  const refreshOrders = useCallback(() => {
    return fetchOrders(pagination.currentPage);
  }, [fetchOrders, pagination.currentPage]);

  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, []);

  const goToPage = useCallback((page) => {
    if (page >= 1 && page <= pagination.pageCount) {
      fetchOrders(page);
    }
  }, [fetchOrders, pagination.pageCount]);

  useEffect(() => {
    fetchOrders(1);
  }, []);

  return {
    orders,
    loading,
    error,
    filters,
    pagination,
    fetchOrders,
    refreshOrders,
    updateFilters,
    goToPage,
    setFilters
  };
}