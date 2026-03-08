"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

export default function DashboardTrendyolProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [errorStatus, setErrorStatus] = useState(null);
  const [search, setSearch] = useState("");

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    setErrorStatus(null);
    try {
      const res = await fetch("/api/trendyol/products", { credentials: "include" });
      let data;
      try {
        data = await res.json();
      } catch (_) {
        setError("Sunucu geçersiz yanıt döndü. API ayarlarını kontrol edin.");
        setErrorStatus(null);
        setProducts([]);
        return;
      }

      if (!res.ok) {
        setErrorStatus(res.status);
        setError(data?.message || "Trendyol API bağlantı hatası");
        setProducts([]);
        return;
      }

      const list =
        data?.content ??
        data?.products ??
        data?.data ??
        (Array.isArray(data) ? data : []);
      if (!Array.isArray(list)) {
        setProducts([]);
        return;
      }
      setProducts(list);
    } catch (err) {
      console.error("Trendyol ürün listesi:", err);
      setError(err.message || "Ürün listesi alınamadı.");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filtered = search
    ? products.filter(
        (p) =>
          String(p.barcode || "").toLowerCase().includes(search.toLowerCase()) ||
          String(p.title || p.name || "").toLowerCase().includes(search.toLowerCase()) ||
          String(p.stockCode || "").toLowerCase().includes(search.toLowerCase())
      )
    : products;

  const toNum = (v) => (v != null && v !== "" ? Number(v) : null);

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <p className="text-gray-500">⏳ Ürünler yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-orange-600 mb-2">Trendyol Ürünleri</h1>
      <p className="text-gray-500 mb-6">
        Trendyol&apos;da listelenen ürünleriniz. Yeni ürün göndermek için{" "}
        <Link href="/dashboard/pazaryeri-gonder" className="text-orange-600 hover:underline">
          Pazaryerine Gönder
        </Link>{" "}
        sayfasını kullanın.
      </p>

      {error && (
        <div className={`mb-6 p-4 rounded-xl border ${errorStatus === 401 ? "bg-amber-50 border-amber-200" : "bg-orange-50 border-orange-200"}`}>
          <p className="font-medium text-amber-800 mb-2">▲ {error}</p>
          <Link
            href="/dashboard/api-settings?tab=trendyol"
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium"
          >
            API Ayarları → Trendyol&apos;a git
          </Link>
        </div>
      )}

      <div className="bg-white border rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Barkod, ürün adı veya stok kodu ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-lg px-3 py-2 flex-1 min-w-[220px]"
        />
        <button
          type="button"
          onClick={fetchProducts}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg"
        >
          🔄 Yenile
        </button>
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left p-3 text-sm font-semibold text-gray-700">Barkod / Stok Kodu</th>
                <th className="text-left p-3 text-sm font-semibold text-gray-700">Ürün Adı</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-700">Fiyat ₺</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-700">Stok</th>
                <th className="text-left p-3 text-sm font-semibold text-gray-700">Durum</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-500">
                    {products.length === 0
                      ? "Ürün bulunamadı veya API ayarlarını kontrol edin."
                      : "Arama kriterine uygun ürün yok."}
                  </td>
                </tr>
              ) : (
                filtered.map((p, i) => (
                  <tr key={p.barcode || p.id || i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3 text-gray-700 font-mono text-sm">
                      {p.barcode || p.stockCode || "—"}
                    </td>
                    <td className="p-3 text-gray-800">{p.title || p.name || "—"}</td>
                    <td className="p-3 text-right">
                      {toNum(p.salePrice) != null
                        ? toNum(p.salePrice).toLocaleString("tr-TR", { minimumFractionDigits: 2 })
                        : "—"}
                    </td>
                    <td className="p-3 text-right">
                      {toNum(p.quantity) != null ? toNum(p.quantity) : "—"}
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          p.approved ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {p.approved ? "Onaylı" : p.status || "—"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 text-sm text-gray-500">
        Toplam {filtered.length} ürün
        {search && ` (filtrelenmiş)`}
      </p>
    </div>
  );
}
