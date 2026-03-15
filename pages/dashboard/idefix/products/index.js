"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function IdefixProductsPage() {
  const [products, setProducts] = useState({ products: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const loadProducts = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Giriş yapmanız gerekiyor.");
        setLoading(false);
        return;
      }
      const res = await fetch(
        `/api/idefix/products/list?page=${page}&limit=${limit}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Ürünler yüklenemedi");
      setProducts({ products: data.products || [] });
    } catch (e) {
      setError(e.message);
      setProducts({ products: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) loadProducts();
  }, [page]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-amber-700 mb-2">İdefix Ürün Güncelleme</h1>
      <p className="text-sm text-gray-500 mb-6">
        İdefix’e gönderilen ürünlerinizi listeleyin. Stok ve fiyat güncellemesi için envanter API’leri kullanılır.
      </p>
      <div className="flex gap-3 mb-6">
        <Link href="/dashboard/api-settings?tab=idefix" className="text-amber-600 hover:underline text-sm">API Ayarları</Link>
        <Link href="/dashboard/pazaryeri-gonder" className="text-amber-600 hover:underline text-sm">Ürün Gönder</Link>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">{error}</div>}
      {loading && !products.products?.length ? (
        <div className="text-gray-500 py-8">Yükleniyor...</div>
      ) : !products.products?.length ? (
        <div className="bg-gray-50 border border-gray-200 p-8 rounded-lg text-gray-600 text-center">Ürün bulunamadı veya API ayarlarınızı kontrol edin.</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 text-sm font-medium text-gray-600">Barkod</th>
                <th className="text-left p-3 text-sm font-medium text-gray-600">Başlık</th>
                <th className="text-left p-3 text-sm font-medium text-gray-600">Stok Kodu</th>
                <th className="text-left p-3 text-sm font-medium text-gray-600">Durum</th>
              </tr>
            </thead>
            <tbody>
              {products.products.map((p) => (
                <tr key={p.id ?? p.barcode ?? p.vendorStockCode} className="border-t">
                  <td className="p-3 text-sm">{p.barcode ?? "—"}</td>
                  <td className="p-3 text-sm">{p.title ?? p.name ?? "—"}</td>
                  <td className="p-3 text-sm">{p.vendorStockCode ?? "—"}</td>
                  <td className="p-3 text-sm">{p.state ?? p.status ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
