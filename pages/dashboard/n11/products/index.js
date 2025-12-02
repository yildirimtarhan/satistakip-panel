// 📁 /pages/dashboard/n11/products/index.js
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function N11ProductsPage() {
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [products, setProducts] = useState([]);

  // 🔹 N11'den ürünleri çek
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/n11/products/list");
      const data = await res.json();

      if (data.success) {
        setProducts(data.products);
      } else {
        alert("N11 ürünleri alınamadı.");
      }
    } catch (err) {
      console.error(err);
      alert("N11 bağlantı hatası!");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // 🔸 Tek ürünü ERP'ye taşı
  const importProduct = async (item) => {
    setImporting(true);
    try {
      const res = await fetch("/api/n11/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });

      const data = await res.json();

      if (data.success) {
        alert("ERP'ye aktarıldı!");
      } else {
        alert("Aktarım başarısız!");
      }
    } catch (err) {
      console.error(err);
      alert("Aktarım hatası!");
    }
    setImporting(false);
  };

  // 🔸 Toplu ERP'ye aktar
  const importAll = async () => {
    if (!confirm("Tüm ürünler ERP'ye aktarılsın mı?")) return;

    setImporting(true);

    for (let item of products) {
      await fetch("/api/n11/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
    }

    alert("Tüm ürünler ERP'ye aktarıldı!");
    setImporting(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">N11 Ürün Listesi</h1>

      <div className="flex justify-between mb-4">
        <Button onClick={fetchProducts} disabled={loading}>
          {loading ? "Yükleniyor..." : "Yenile"}
        </Button>

        <Button onClick={importAll} disabled={importing || loading}>
          {importing ? "Aktarılıyor..." : "Tümünü ERP'ye Aktar"}
        </Button>
      </div>

      <div className="overflow-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">Resim</th>
              <th className="p-2">Başlık</th>
              <th className="p-2">SKU</th>
              <th className="p-2">Barkod</th>
              <th className="p-2">Fiyat</th>
              <th className="p-2">Stok</th>
              <th className="p-2">İşlem</th>
            </tr>
          </thead>

          <tbody>
            {products.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center p-4">
                  Ürün bulunamadı.
                </td>
              </tr>
            )}

            {products.map((p, i) => (
              <tr key={i} className="border-b">
                <td className="p-2">
                  <img
                    src={p.mainImage}
                    alt=""
                    className="w-14 h-14 object-cover rounded"
                  />
                </td>

                <td className="p-2">{p.title}</td>
                <td className="p-2">{p.productSellerCode}</td>
                <td className="p-2">{p.barcode || "-"}</td>
                <td className="p-2">{p.price} TL</td>
                <td className="p-2">{p.stock}</td>

                <td className="p-2">
                  <Button
                    size="sm"
                    onClick={() => importProduct(p)}
                    disabled={importing}
                  >
                    ERP'ye Aktar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
