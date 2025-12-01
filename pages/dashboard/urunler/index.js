// 📁 /pages/dashboard/urunler/index.js
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ProductListPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Ürünleri API'den çek
  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products/list");
      const data = await res.json();

      if (data.success) {
        setProducts(data.products);
      }
    } catch (err) {
      console.error("Ürünler alınamadı:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-semibold">Ürünler</h1>

        <Link href="/dashboard/urunler/yeni">
          <Button>+ Yeni Ürün Ekle</Button>
        </Link>
      </div>

      {loading ? (
        <p>Yükleniyor...</p>
      ) : products.length === 0 ? (
        <p>Henüz ürün eklenmemiş.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="p-2 text-left">Resim</th>
                <th className="p-2 text-left">Ürün Adı</th>
                <th className="p-2 text-left">SKU</th>
                <th className="p-2 text-left">Barkod</th>
                <th className="p-2 text-left">Fiyat (TL)</th>
                <th className="p-2 text-left">Stok</th>
                <th className="p-2 text-left">İşlemler</th>
              </tr>
            </thead>

            <tbody>
              {products.map((p) => (
                <tr key={p._id} className="border-b hover:bg-gray-50">
                  <td className="p-2">
                    <img
                      src={p.images?.[0] || "/no-image.png"}
                      alt={p.name}
                      className="w-14 h-14 object-cover rounded"
                    />
                  </td>

                  <td className="p-2">{p.name}</td>
                  <td className="p-2">{p.sku || "-"}</td>
                  <td className="p-2">{p.barcode || "-"}</td>
                  <td className="p-2 font-semibold">{p.priceTl} TL</td>
                  <td className="p-2">{p.stock}</td>

                  <td className="p-2 space-x-2">
                    <Link href={`/dashboard/urunler/edit/${p._id}`}>
                      <Button variant="outline" size="sm">
                        Düzenle
                      </Button>
                    </Link>

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteProduct(p._id)}
                    >
                      Sil
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
