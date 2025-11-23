// 📁 /pages/dashboard/n11/products.js
"use client";

import { useEffect, useState } from "react";

export default function N11ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [selected, setSelected] = useState(null); // 🧾 Detay modal verisi

  // 🔁 Veritabanındaki N11 ürünlerini çek
  const fetchLocalProducts = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/n11/products/local");
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "N11 ürünleri alınamadı");
        setProducts([]);
      } else {
        setProducts(Array.isArray(data.products) ? data.products : []);
      }
    } catch (err) {
      console.error("N11 ürün liste hata:", err);
      setError("Sunucuya bağlanırken hata oluştu");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocalProducts();
  }, []);

  // 🔄 N11'den yeniden ürün senkronu
  const handleSync = async () => {
    if (!confirm("N11'den ürünleri tekrar çekmek istiyor musun?")) return;

    setSyncing(true);
    setError("");
    try {
      const res = await fetch("/api/n11/products/sync");
      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.message || "Senkronizasyon başarısız");
      } else {
        alert(`✅ N11 ürünleri senkron edildi. Kayıt sayısı: ${data.count}`);
      }

      // Senkron sonrası listeyi yenile
      await fetchLocalProducts();
    } catch (err) {
      console.error("N11 sync hata:", err);
      alert("N11 ile bağlantı kurulamadı");
    } finally {
      setSyncing(false);
    }
  };

  // 🔍 Ürün detayı (N11 API'den) – sellerProductCode ile
  const handleShowDetail = async (p) => {
    if (!p?.sellerProductCode && !p?.productSellerCode) {
      alert("Bu ürün için sellerProductCode bulunamadı.");
      return;
    }

    const code = p.sellerProductCode || p.productSellerCode;

    setDetailLoading(true);
    setSelected(null);
    try {
      const res = await fetch(
        `/api/n11/products/detail?sellerProductCode=${encodeURIComponent(
          code
        )}`
      );
      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.message || "Ürün detay alınamadı");
        return;
      }

      setSelected({
        sellerProductCode: data.sellerProductCode,
        product: data.product,
        local: p,
      });
    } catch (err) {
      console.error("N11 ürün detay hata:", err);
      alert("Ürün detayı alınırken hata oluştu");
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Başlık + üst bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-orange-600">
            📦 N11 Ürünleri
          </h1>
          <p className="text-sm text-slate-500">
            N11&apos;den senkron edilen ürünleri görüntüleyebilir, detaylarını
            inceleyebilirsin.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={fetchLocalProducts}
            disabled={loading}
            className="px-3 py-2 rounded-xl border text-sm hover:bg-slate-50"
          >
            ↻ Listeyi Yenile
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-4 py-2 rounded-xl bg-orange-500 text-white text-sm hover:bg-orange-600 disabled:opacity-60"
          >
            {syncing ? "N11 ile Senkronize Ediliyor..." : "🔄 N11'den Senkron Et"}
          </button>
        </div>
      </div>

      {/* Hata mesajı */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Liste alanı */}
      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-slate-500 text-sm">
            N11 ürünleri yükleniyor...
          </div>
        ) : products.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-sm">
            Henüz N11 ürün kaydı bulunamadı.
            <br />
            <span className="text-xs">
              Üstteki &quot;N11&apos;den Senkron Et&quot; butonu ile ürünleri
              çekebilirsin.
            </span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Ürün</th>
                  <th className="px-3 py-2 text-left">SKU</th>
                  <th className="px-3 py-2 text-right">Fiyat</th>
                  <th className="px-3 py-2 text-right">Stok</th>
                  <th className="px-3 py-2 text-left">Onay</th>
                  <th className="px-3 py-2 text-left">Marka</th>
                  <th className="px-3 py-2 text-left">Kategori</th>
                  <th className="px-3 py-2 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const price = Number(p.price || 0);
                  const stock = Number(p.stock || 0);
                  const approval = p.approvalStatus || p.status || "-";

                  return (
                    <tr
                      key={p._id || p.productId || p.sellerProductCode}
                      className="border-t hover:bg-slate-50"
                    >
                      <td className="px-3 py-2 max-w-xs">
                        <div className="font-medium text-slate-900 truncate">
                          {p.title || p.productName || "-"}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          N11 ID: {p.productId || "-"}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700">
                        {p.sellerProductCode || p.productSellerCode || "-"}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {price ? `${price.toFixed(2)} ₺` : "-"}
                      </td>
                      <td className="px-3 py-2 text-right">{stock}</td>
                      <td className="px-3 py-2 text-xs">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full border ${
                            String(approval).toLowerCase().includes("onay")
                              ? "bg-green-50 border-green-200 text-green-700"
                              : "bg-slate-50 border-slate-200 text-slate-700"
                          }`}
                        >
                          {approval}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700">
                        {p.brand || "-"}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700">
                          {p.categoryFullPath || p.categoryName || "-"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            className="px-2 py-1 text-xs rounded-lg border text-slate-700 hover:bg-slate-100"
                            onClick={() => handleShowDetail(p)}
                            disabled={detailLoading}
                          >
                            🔍 Detay
                          </button>
                          <button
                            className="px-2 py-1 text-xs rounded-lg border border-dashed text-slate-400 cursor-not-allowed"
                            title="ERP ürünleri ile eşleştirme yakında"
                            disabled
                          >
                            🔗 ERP ile Eşleştir
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

      {/* 🔍 Detay Modalı */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 max-h-[80vh] flex flex-col">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div>
                <h2 className="font-bold text-orange-600">
                  N11 Ürün Detayı
                </h2>
                <p className="text-xs text-slate-500">
                  Seller SKU: {selected.sellerProductCode}
                </p>
              </div>
              <button
                className="text-slate-500 text-sm hover:text-slate-800"
                onClick={() => setSelected(null)}
              >
                ✖ Kapat
              </button>
            </div>

            <div className="p-4 overflow-auto text-xs space-y-3">
              {selected.local && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <h3 className="font-semibold text-slate-800 mb-1">
                    ERP&apos;de Saklanan Özet
                  </h3>
                  <p>
                    <strong>Başlık:</strong>{" "}
                    {selected.local.title || selected.local.productName || "-"}
                  </p>
                  <p>
                    <strong>N11 ID:</strong> {selected.local.productId || "-"}
                  </p>
                  <p>
                    <strong>Fiyat:</strong>{" "}
                    {selected.local.price
                      ? `${Number(selected.local.price).toFixed(2)} ₺`
                      : "-"}
                  </p>
                  <p>
                    <strong>Stok:</strong> {selected.local.stock}
                  </p>
                </div>
              )}

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <h3 className="font-semibold text-slate-800 mb-1">
                  N11&apos;den Gelen Ham Veri
                </h3>
                <pre className="whitespace-pre-wrap break-all">
                  {JSON.stringify(selected.product, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
