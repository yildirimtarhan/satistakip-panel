"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

export default function PazaramaProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [errorStatus, setErrorStatus] = useState(null);
  const [search, setSearch] = useState("");
  const [approved, setApproved] = useState("true");
  const [page, setPage] = useState(1);
  const [edits, setEdits] = useState({});
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    setErrorStatus(null);
    setSendResult(null);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("accessToken");
      if (!token) {
        setError("Giriş yapmanız gerekiyor.");
        setProducts([]);
        setLoading(false);
        return;
      }
      const params = new URLSearchParams({
        approved: approved,
        page: String(page),
        size: "250",
      });
      if (search.trim()) params.set("code", search.trim());
      const res = await fetch(`/api/pazarama/products/list?${params}`, {
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorStatus(res.status);
        setError(data?.error || data?.message || "Pazarama API bağlantı hatası");
        setProducts([]);
        setLoading(false);
        return;
      }

      const list = data?.data ?? (Array.isArray(data) ? data : []);
      setProducts(Array.isArray(list) ? list : []);
      setEdits({});
    } catch (err) {
      console.error("Pazarama ürün listesi:", err);
      setError(err.message || "Ürün listesi alınamadı.");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [approved, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filtered =
    search && !products.some((p) => String(p.code || p.barcode || "").toLowerCase() === search.trim().toLowerCase())
      ? products
      : products.filter(
          (p) =>
            !search ||
            String(p.code || p.barcode || "").toLowerCase().includes(search.toLowerCase()) ||
            String(p.title || p.name || p.productName || "").toLowerCase().includes(search.toLowerCase()) ||
            String(p.stockCode || "").toLowerCase().includes(search.toLowerCase())
        );

  const toNum = (v) => (v != null && v !== "" ? Number(v) : null);
  const getVal = (p, field) => {
    const code = p.code || p.barcode;
    if (edits[code] && edits[code][field] !== undefined) return edits[code][field];
    const raw = p[field] ?? (field === "stockCount" ? p.quantity ?? p.stock : null);
    return raw != null && raw !== "" ? String(raw) : "";
  };
  const setVal = (code, field, value) => {
    setEdits((prev) => ({
      ...prev,
      [code]: { ...(prev[code] || {}), [field]: value === "" ? undefined : value },
    }));
  };

  const editedItems = Object.entries(edits).filter(
    ([code, v]) =>
      v &&
      (v.listPrice !== undefined || v.salePrice !== undefined || v.stockCount !== undefined || v.stock !== undefined)
  );
  const hasEdits = editedItems.length > 0;

  const handleSendUpdates = async () => {
    if (!hasEdits) return;
    const token = localStorage.getItem("token") || localStorage.getItem("accessToken");
    if (!token) {
      setError("Giriş yapmanız gerekiyor.");
      return;
    }
    setSending(true);
    setSendResult(null);
    try {
      const items = editedItems.map(([code, v]) => {
        const p = products.find((x) => (x.code || x.barcode) === code) || {};
        const item = { code };
        if (v.listPrice !== undefined) item.listPrice = toNum(v.listPrice) ?? toNum(p.listPrice);
        if (v.salePrice !== undefined) item.salePrice = toNum(v.salePrice) ?? toNum(p.salePrice);
        if (v.stockCount !== undefined || v.stock !== undefined) {
          item.stockCount = toNum(v.stockCount ?? v.stock) ?? toNum(p.quantity ?? p.stockCount) ?? 0;
        }
        return item;
      }).filter(
        (it) =>
          it.code &&
          ((it.listPrice != null && it.listPrice > 0) ||
            (it.salePrice != null && it.salePrice > 0) ||
            (it.stockCount != null))
      );

      if (items.length === 0) {
        setSendResult({ success: false, error: "Güncellenecek geçerli veri yok." });
        setSending(false);
        return;
      }

      const res = await fetch("/api/pazarama/products/update-price-stock", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();

      if (data.success) {
        setEdits({});
        setSendResult({ success: true, message: data.message });
        await fetchProducts();
      } else {
        setSendResult({ success: false, error: data.error || data.message || "Güncelleme başarısız." });
      }
    } catch (err) {
      setSendResult({ success: false, error: err.message || "Güncelleme gönderilemedi." });
    } finally {
      setSending(false);
    }
  };

  const getStateLabel = (s) => {
    const map = {
      1: "Onay Bekliyor",
      2: "Onay Bekliyor (Güncelleme)",
      3: "Onaylandı",
      6: "Reddedildi",
      7: "Redden Dönüp Güncellenen",
    };
    return map[s] ?? (s ? String(s) : "—");
  };

  if (loading && products.length === 0) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <p className="text-gray-500">⏳ Pazarama ürünleri yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-orange-600 mb-2">Pazarama Ürünleri</h1>
      <p className="text-gray-500 mb-6">
        Pazarama&apos;da listelenen ürünleriniz. Fiyat ve stok düzenleyip Pazarama&apos;ya gönderebilirsiniz. Yeni ürün için{" "}
        <Link href="/dashboard/pazaryeri-gonder" className="text-orange-600 hover:underline font-medium">
          Pazaryerine Gönder
        </Link>
        .
      </p>

      {error && (
        <div
          className={`mb-6 p-4 rounded-xl border ${
            errorStatus === 401 ? "bg-amber-50 border-amber-200" : "bg-orange-50 border-orange-200"
          }`}
        >
          <p className="font-medium text-amber-800 mb-2">▲ {error}</p>
          <Link
            href="/dashboard/api-settings?tab=pazarama"
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium"
          >
            API Ayarları → Pazarama&apos;a git
          </Link>
        </div>
      )}

      {sendResult && (
        <div
          className={`mb-6 p-4 rounded-xl border ${
            sendResult.success ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {sendResult.success ? sendResult.message : sendResult.error}
        </div>
      )}

      <div className="bg-white border rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-center">
        <select
          value={approved}
          onChange={(e) => {
            setApproved(e.target.value);
            setPage(1);
          }}
          className="border rounded-lg px-3 py-2"
        >
          <option value="true">Onaylı ürünler</option>
          <option value="false">Onay bekleyen ürünler</option>
        </select>
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
          className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg"
        >
          🔄 Yenile
        </button>
        {hasEdits && (
          <button
            type="button"
            onClick={handleSendUpdates}
            disabled={sending}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white px-4 py-2 rounded-lg font-medium"
          >
            {sending ? "Gönderiliyor..." : `📤 Güncellemeleri Gönder (${editedItems.length})`}
          </button>
        )}
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left p-3 text-sm font-semibold text-gray-700">Barkod</th>
                <th className="text-left p-3 text-sm font-semibold text-gray-700">Ürün Adı</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-700">Liste Fiyatı ₺</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-700">Satış Fiyatı ₺</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-700">Stok</th>
                <th className="text-left p-3 text-sm font-semibold text-gray-700">Durum</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-500">
                    {products.length === 0
                      ? "Ürün bulunamadı veya API ayarlarını kontrol edin."
                      : "Arama kriterine uygun ürün yok."}
                  </td>
                </tr>
              ) : (
                filtered.map((p, i) => {
                  const code = p.code || p.barcode || p.stockCode;
                  if (!code) return null;
                  return (
                    <tr key={code} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-3 text-gray-700 font-mono text-sm">{code}</td>
                      <td className="p-3 text-gray-800 max-w-[200px] truncate" title={p.title || p.name || p.productName}>
                        {p.title || p.name || p.productName || "—"}
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={getVal(p, "listPrice")}
                          onChange={(e) => setVal(code, "listPrice", e.target.value)}
                          className="w-24 text-right border rounded px-2 py-1 text-sm"
                          placeholder="—"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={getVal(p, "salePrice")}
                          onChange={(e) => setVal(code, "salePrice", e.target.value)}
                          className="w-24 text-right border rounded px-2 py-1 text-sm"
                          placeholder="—"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={getVal(p, "stockCount")}
                          onChange={(e) => setVal(code, "stockCount", e.target.value)}
                          className="w-20 text-right border rounded px-2 py-1 text-sm"
                          placeholder="—"
                        />
                      </td>
                      <td className="p-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            p.approved || p.state === 3
                              ? "bg-green-100 text-green-700"
                              : p.state === 6
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {p.approved === true
                            ? "Onaylı"
                            : p.approved === false
                              ? "Beklemede"
                              : getStateLabel(p.state)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 text-sm text-gray-500">
        Toplam {filtered.length} ürün
        {search && ` (filtrelenmiş)`}
        {hasEdits && ` • ${editedItems.length} değişiklik gönderilmeyi bekliyor`}
      </p>
    </div>
  );
}
