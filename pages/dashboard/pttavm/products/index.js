"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

/** PTT AVM ürün listesi: barkod, urunAdi, miktar, kdVli. Fiyat/stok güncelle + ERP ortak stok. */
export default function PttAvmProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [edits, setEdits] = useState({});
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [isActive, setIsActive] = useState("");
  const [isInStock, setIsInStock] = useState("");
  const [searchPage, setSearchPage] = useState(1);
  const [erpLoading, setErpLoading] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    setSendResult(null);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("accessToken");
      if (!token) {
        setError("Giriş yapmanız gerekiyor.");
        setProducts([]);
        setLoading(false);
        return;
      }
      const params = new URLSearchParams();
      if (isActive !== "") params.set("isActive", isActive);
      if (isInStock !== "") params.set("isInStock", isInStock);
      if (searchPage > 0) params.set("searchPage", String(searchPage));
      const url = `/api/pttavm/products/search${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url, {
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.message || "PTT AVM API bağlantı hatası");
        setProducts([]);
        setLoading(false);
        return;
      }
      const list = data?.products ?? (Array.isArray(data) ? data : []);
      setProducts(Array.isArray(list) ? list : []);
      setEdits({});
    } catch (err) {
      setError(err.message || "Ürün listesi alınamadı.");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [isActive, isInStock, searchPage]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const barcodeKey = (p) => String(p.barkod ?? p.barcode ?? p.urunId ?? "").trim() || null;
  const getVal = (p, field) => {
    const key = barcodeKey(p);
    if (!key) return "";
    if (edits[key] && edits[key][field] !== undefined) return edits[key][field];
    if (field === "quantity" || field === "miktar") return p.miktar != null ? String(p.miktar) : (p.quantity != null ? String(p.quantity) : "");
    if (field === "priceWithVAT" || field === "kdVli" || field === "price") return p.kdVli != null ? String(p.kdVli) : (p.priceWithVAT != null ? String(p.priceWithVAT) : "");
    return "";
  };
  const setVal = (key, field, value) => {
    if (!key) return;
    setEdits((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), [field]: value === "" ? undefined : value },
    }));
  };

  const editedItems = Object.entries(edits).filter(
    ([_, v]) => v && (v.quantity !== undefined || v.miktar !== undefined || v.priceWithVAT !== undefined || v.kdVli !== undefined)
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
      const items = editedItems.map(([key, v]) => {
        const p = products.find((x) => barcodeKey(x) === key) || {};
        const barcode = key;
        const quantity = v.quantity ?? v.miktar ?? p.miktar ?? p.quantity ?? 0;
        const priceWithVAT = v.priceWithVAT ?? v.kdVli ?? p.kdVli ?? p.priceWithVAT ?? 0;
        return {
          barcode,
          quantity: Math.max(0, Number(quantity)),
          ...(Number(priceWithVAT) > 0 ? { priceWithVAT: Number(priceWithVAT), vatRate: 18 } : {}),
        };
      }).filter((it) => it.barcode);
      if (!items.length) {
        setSendResult({ success: false, error: "Gönderilecek geçerli ürün yok." });
        setSending(false);
        return;
      }
      const res = await fetch("/api/pttavm/products/stock-prices", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (data.success !== false) {
        setEdits({});
        setSendResult({ success: true, message: data.message || `Güncelleme gönderildi. trackingId: ${data.trackingId || "-"}` });
        fetchProducts();
      } else {
        setSendResult({ success: false, error: data.message || "Güncelleme başarısız." });
      }
    } catch (err) {
      setSendResult({ success: false, error: err.message || "Güncelleme gönderilemedi." });
    } finally {
      setSending(false);
    }
  };

  const handleErpStokAl = async () => {
    const token = localStorage.getItem("token") || localStorage.getItem("accessToken");
    if (!token) return;
    setErpLoading(true);
    try {
      const res = await fetch("/api/products/list", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const erpList = data?.products ?? data?.items ?? [];
      if (!erpList.length) {
        setSendResult({ success: false, error: "ERP'de ürün bulunamadı." });
        setErpLoading(false);
        return;
      }
      const byBarcode = {};
      erpList.forEach((p) => {
        const b = String(p.barcode ?? p.barkod ?? p.sku ?? "").trim();
        if (b) byBarcode[b] = Math.max(0, Number(p.stock ?? 0));
      });
      setEdits((prev) => {
        const next = { ...prev };
        products.forEach((p) => {
          const key = barcodeKey(p);
          if (!key) return;
          const erpStock = byBarcode[key];
          if (erpStock != null) next[key] = { ...(next[key] || {}), quantity: String(erpStock), miktar: String(erpStock) };
        });
        return next;
      });
      setSendResult({ success: true, message: `ERP'den stok alındı. Düzenleyip "PTT AVM'ye gönder" ile güncelleyebilirsiniz.` });
    } catch (e) {
      setSendResult({ success: false, error: e.message || "ERP ürün listesi alınamadı." });
    } finally {
      setErpLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-orange-600 mb-2">PTT AVM Ürün Listesi</h1>
      <p className="text-gray-500 mb-6">
        PTT AVM&apos;deki ürünlerinizi listeleyin, fiyat ve stok güncelleyin. ERP ortak stok ile eşitleyebilirsiniz. Yeni ürün için{" "}
        <Link href="/dashboard/pazaryeri-gonder" className="text-orange-600 hover:underline font-medium">Pazaryerine Gönder</Link>.
      </p>

      {error && (
        <div className="mb-6 p-4 rounded-xl border bg-orange-50 border-orange-200 text-orange-800">
          <p className="font-medium mb-2">▲ {error}</p>
          <Link href="/dashboard/api-settings?tab=pttavm" className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium">
            API Ayarları → PTT AVM
          </Link>
        </div>
      )}

      {sendResult && (
        <div className={`mb-6 p-4 rounded-xl border ${sendResult.success ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          {sendResult.success ? sendResult.message : sendResult.error}
        </div>
      )}

      <div className="bg-white border rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-center">
        <select value={isActive} onChange={(e) => { setIsActive(e.target.value); setSearchPage(1); }} className="border rounded-lg px-3 py-2">
          <option value="">Durum: Tümü</option>
          <option value="1">Aktif</option>
          <option value="2">Pasif</option>
        </select>
        <select value={isInStock} onChange={(e) => { setIsInStock(e.target.value); setSearchPage(1); }} className="border rounded-lg px-3 py-2">
          <option value="">Stok: Tümü</option>
          <option value="1">Mevcut</option>
          <option value="2">Mevcut Değil</option>
        </select>
        <input
          type="number"
          min="1"
          value={searchPage}
          onChange={(e) => setSearchPage(Number(e.target.value) || 1)}
          className="border rounded-lg px-3 py-2 w-24"
          placeholder="Sayfa"
        />
        <button type="button" onClick={fetchProducts} disabled={loading} className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg disabled:opacity-50">
          {loading ? "Yükleniyor..." : "🔄 Yenile"}
        </button>
        <button type="button" onClick={handleErpStokAl} disabled={erpLoading || !products.length} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">
          {erpLoading ? "Alınıyor..." : "📥 ERP'den stok al"}
        </button>
        {hasEdits && (
          <button type="button" onClick={handleSendUpdates} disabled={sending} className="bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white px-4 py-2 rounded-lg font-medium">
            {sending ? "Gönderiliyor..." : `📤 PTT AVM'ye gönder (${editedItems.length})`}
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
                <th className="text-right p-3 text-sm font-semibold text-gray-700">Stok (miktar)</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-700">Fiyat (KDV’li) ₺</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 && !loading ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-gray-500">Ürün bulunamadı veya API ayarlarını kontrol edin.</td>
                </tr>
              ) : (
                products.map((p, i) => {
                  const key = barcodeKey(p);
                  if (!key) return null;
                  return (
                    <tr key={key} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-3 text-gray-700 font-mono text-sm">{key}</td>
                      <td className="p-3 text-gray-800 max-w-[280px] truncate" title={p.urunAdi || p.name}>{p.urunAdi || p.name || "—"}</td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={getVal(p, "quantity") || getVal(p, "miktar")}
                          onChange={(e) => { setVal(key, "quantity", e.target.value); setVal(key, "miktar", e.target.value); }}
                          className="w-24 text-right border rounded px-2 py-1 text-sm"
                          placeholder="—"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={getVal(p, "priceWithVAT") || getVal(p, "kdVli") || getVal(p, "price")}
                          onChange={(e) => { setVal(key, "priceWithVAT", e.target.value); setVal(key, "kdVli", e.target.value); }}
                          className="w-28 text-right border rounded px-2 py-1 text-sm"
                          placeholder="—"
                        />
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
        Toplam {products.length} ürün {hasEdits && ` • ${editedItems.length} değişiklik gönderilmeyi bekliyor`}
      </p>
    </div>
  );
}
