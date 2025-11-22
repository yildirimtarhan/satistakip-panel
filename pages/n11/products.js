// 📁 /pages/dashboard/n11/products.js
"use client";

import { useEffect, useState } from "react";

export default function N11ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // Veritabanından N11 ürünlerini çek
  const fetchLocalProducts = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/n11/products/local");
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "N11 ürünleri alınamadı");
        setProducts([]);
        return;
      }

      setProducts(data.products || []);
    } catch (err) {
      console.error("N11 ürün listesi hata:", err);
      setError("Sunucu hatası oluştu");
    } finally {
      setLoading(false);
    }
  };

  // N11'den tekrar sync et
  const handleSync = async () => {
    try {
      setSyncing(true);
      setError("");

      const res = await fetch("/api/n11/products/sync");
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "N11 senkron hatası");
      }

      // Senkron sonrası local listeyi yenile
      await fetchLocalProducts();
    } catch (err) {
      console.error("N11 sync hata:", err);
      setError("Senkron sırasında hata oluştu");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchLocalProducts();
  }, []);

  // Arama filtresi (title, sellerProductCode, brand)
  const filteredProducts = products.filter((p) => {
    const q = search.toLowerCase();
    return (
      (p.title || "").toLowerCase().includes(q) ||
      (p.sellerProductCode || "").toLowerCase().includes(q) ||
      (p.brand || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold">N11 Ürünleri</h1>
          <p className="text-sm text-gray-500">
            N11 mağazandaki ürünler burada listelenir. Senkron için aşağıdaki butonu kullanabilirsin.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-2">
          <input
            type="text"
            placeholder="Ürün adı / SKU / Marka ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm w-full md:w-64"
          />

          <button
            onClick={handleSync}
            disabled={syncing}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-md"
          >
            {syncing ? "Senkron yapılıyor..." : "🔄 N11'den Yenile (Sync)"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 border border-red-300 bg-red-50 px-3 py-2 rounded-md">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-gray-600 text-sm">Yükleniyor...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-gray-600 text-sm">
          Hiç N11 ürünü bulunamadı.{" "}
          <button
            onClick={handleSync}
            className="text-orange-600 underline"
          >
            N11&apos;den ürün çek
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-lg bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-xs uppercase text-gray-600">
              <tr>
                <th className="px-3 py-2 text-left">Resim</th>
                <th className="px-3 py-2 text-left">Ürün Adı</th>
                <th className="px-3 py-2 text-left">SKU</th>
                <th className="px-3 py-2 text-left">N11 ID</th>
                <th className="px-3 py-2 text-right">Fiyat</th>
                <th className="px-3 py-2 text-right">Stok</th>
                <th className="px-3 py-2 text-left">Durum</th>
                <th className="px-3 py-2 text-left">Marka</th>
                <th className="px-3 py-2 text-left">Kategori</th>
                <th className="px-3 py-2 text-center">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => {
                const img =
                  (p.imageUrls && p.imageUrls[0]) ||
                  p.raw?.images?.image?.[0] ||
                  null;

                return (
                  <tr key={p._id} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={img}
                          alt={p.title || "Ürün görseli"}
                          className="w-12 h-12 object-cover rounded-md border"
                        />
                      ) : (
                        <div className="w-12 h-12 flex items-center justify-center text-xs text-gray-400 border rounded-md">
                          Yok
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 max-w-xs">
                      <div className="font-medium text-gray-900 truncate">
                        {p.title || "-"}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {p.raw?.subtitle || ""}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700">
                      {p.sellerProductCode || "-"}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700">
                      {p.productId || p.raw?.id || "-"}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {p.price != null ? (
                        <span className="font-medium">
                          {Number(p.price).toFixed(2)} ₺
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {p.stock != null ? p.stock : "-"}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          "inline-flex px-2 py-1 rounded-full text-xs " +
                          (p.approvalStatus === "1"
                            ? "bg-green-100 text-green-700"
                            : p.approvalStatus === "2"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-600")
                        }
                      >
                        {p.approvalStatus === "1"
                          ? "Onaylı"
                          : p.approvalStatus === "2"
                          ? "Beklemede"
                          : p.approvalStatus || "Bilinmiyor"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700">
                      {p.brand || "-"}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700 max-w-xs truncate">
                      {p.categoryFullPath || "-"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex flex-col gap-1">
                        <button
                          className="text-xs bg-blue-500 text-white px-2 py-1 rounded-md disabled:opacity-60"
                          disabled
                        >
                          ERP&apos;ye Aktar (yakında)
                        </button>
                        <button
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md"
                          onClick={() =>
                            alert(
                              `Geçici detay:\n\n${JSON.stringify(
                                p.raw || p,
                                null,
                                2
                              ).slice(0, 1000)}...`
                            )
                          }
                        >
                          Detay
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
