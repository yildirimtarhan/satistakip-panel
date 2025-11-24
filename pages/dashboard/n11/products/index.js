// 📁 /pages/dashboard/n11/products/index.js
"use client";
import { useState, useEffect } from "react";

export default function N11ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    const res = await fetch("/api/n11/products", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setProducts(data.products || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-orange-600 mb-4">📦 N11 Ürünleri</h1>

      {loading ? (
        <div>Yükleniyor...</div>
      ) : (
        <table className="w-full bg-white rounded-xl shadow text-sm">
          <thead className="bg-orange-100">
            <tr>
              <th>#</th>
              <th>Ürün</th>
              <th>Barkod</th>
              <th>SKU</th>
              <th>Durum</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => (
              <tr key={i} className="border-b">
                <td>{i + 1}</td>
                <td>{p?.title}</td>
                <td>{p?.barcode}</td>
                <td>{p?.sku}</td>
                <td>{p?.status || "-"}</td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr><td colSpan="5" className="p-4 text-center">Ürün bulunamadı</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
