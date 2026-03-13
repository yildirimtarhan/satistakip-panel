"use client";

import { useEffect, useState, useCallback } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import Link from "next/link";

const formatRate = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(2) : "—";
};

const eurTry = (rates) => {
  if (!rates) return null;
  if (rates.EURTRY != null) return Number(rates.EURTRY);
  const tryRate = Number(rates.TRY ?? rates.USDTRY ?? 0);
  const eurRate = Number(rates.EUR ?? 0);
  if (!tryRate || !eurRate) return null;
  return tryRate / eurRate;
};

const fmt = (n) => Number(n || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function BuyboxPanel() {
  const [loading, setLoading] = useState(false);
  const [fxLoading, setFxLoading] = useState(false);
  const [fx, setFx] = useState(null);
  const [margin, setMargin] = useState(15);
  const [minMargin, setMinMargin] = useState(10);
  const [autoUpdate, setAutoUpdate] = useState(false);
  const [urunler, setUrunler] = useState([]);
  const [results, setResults] = useState([]);
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState(null);
  const [activeTab, setActiveTab] = useState("analiz");

  const getAuthHeaders = useCallback(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") || localStorage.getItem("accessToken") : null;
    return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  }, []);

  const showMessage = (text, type = "info") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const loadProducts = useCallback(async () => {
    try {
      const r = await fetch("/api/products/list", { headers: getAuthHeaders() });
      const data = await r.json();
      const list = data?.products ?? data?.items ?? (Array.isArray(data) ? data : []);
      const arr = Array.isArray(list) ? list : [];
      setUrunler(arr);
      return arr.length;
    } catch (e) {
      try {
        const r2 = await fetch("/api/urunler", { headers: getAuthHeaders() });
        const d2 = await r2.json();
        const list = Array.isArray(d2) ? d2 : d2?.products ?? d2?.data ?? [];
        setUrunler(list);
        return list.length;
      } catch (_) {
        console.error("Ürünler yüklenemedi:", e);
        return 0;
      }
    }
  }, [getAuthHeaders]);

  const fetchRates = useCallback(async () => {
    setFxLoading(true);
    try {
      const res = await fetch("/api/currency/update", { headers: getAuthHeaders() });
      const data = await res.json();
      if (data?.ok) setFx(data.data);
    } catch (e) {
      console.error(e);
    }
    setFxLoading(false);
  }, [getAuthHeaders]);

  const updateRates = useCallback(async () => {
    setFxLoading(true);
    try {
      const res = await fetch("/api/currency/update", { method: "POST", headers: getAuthHeaders() });
      const data = await res.json();
      if (data?.ok) {
        setFx(data.data);
        showMessage("Döviz kurları güncellendi.", "success");
      } else {
        showMessage(data?.message || "Kur alınamadı.", "error");
      }
    } catch (e) {
      showMessage("Kur güncellenemedi.", "error");
    }
    setFxLoading(false);
  }, [getAuthHeaders]);

  const runBuybox = async () => {
    const items = urunler
      .filter((u) => (u.barkod || u.barcode) && Number(u.alisFiyati || u.maliyet || u.purchasePrice || 0) > 0)
      .map((u) => ({
        barcode: u.barkod || u.barcode || `U${u._id}`,
        baseCurrency: (u.doviz || u.currency || "TRY").toUpperCase(),
        cost: Number(u.alisFiyati || u.maliyet || u.purchasePrice || 0),
        stock: Number(u.stok || u.stock || 0),
      }));

    if (items.length === 0) {
      showMessage("Analiz için en az 1 ürün (barkod + maliyet) gerekli.", "error");
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/trendyol/buybox-monitor", {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ autoUpdate, marginPct: margin, minMarginPct: minMargin, items }),
      });
      const data = await res.json();

      if (data?.ok) {
        setResults(data.results);
        setActiveTab("sonuclar");
        for (const r of data.results) {
          await fetch("/api/trendyol/buybox-history", {
            method: "POST",
            headers: getAuthHeaders(),
            credentials: "include",
            body: JSON.stringify({
              barcode: r.barcode,
              suggestedPrice: r.suggestedSalePrice,
              margin: r.marginPct,
              status: autoUpdate ? "Otomatik Güncellendi" : "Analiz",
            }),
          });
        }
        fetchHistory();
        showMessage(
          autoUpdate
            ? `${data.results.length} ürün fiyatı Trendyol'a gönderildi.`
            : `${data.results.length} ürün için önerilen fiyat hesaplandı.`,
          "success"
        );
      } else {
        showMessage(data?.message || "BuyBox analizi başarısız.", "error");
      }
    } catch (e) {
      showMessage("İstek sırasında hata oluştu.", "error");
      console.error(e);
    }
    setLoading(false);
  };

  const exportExcel = () => {
    if (results.length === 0) {
      showMessage("Dışa aktarılacak veri yok.", "error");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(results);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BuyBox");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    saveAs(new Blob([buf]), `buybox-${new Date().toISOString().slice(0, 10)}.xlsx`);
    showMessage("Excel dosyası indirildi.", "success");
  };

  const fetchHistory = useCallback(async () => {
    try {
      const r = await fetch("/api/trendyol/buybox-history", { headers: getAuthHeaders(), credentials: "include" });
      const d = await r.json();
      if (d?.ok) setHistory(d.data);
    } catch (e) {
      console.error(e);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    loadProducts();
    fetchRates();
    fetchHistory();
  }, [loadProducts, fetchRates, fetchHistory]);

  const validCount = urunler.filter(
    (u) => (u.barkod || u.barcode) && Number(u.alisFiyati || u.maliyet || u.purchasePrice || 0) > 0
  ).length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-800">BuyBox Fiyat Stratejisi</h1>
          <p className="text-slate-600 text-sm mt-1">
            Trendyol&apos;da rekabetçi fiyat hesaplama ve otomatik fiyat/stok güncelleme
          </p>
        </div>
      </div>

      {/* Message toast */}
      {message && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
            message.type === "success"
              ? "bg-emerald-600 text-white"
              : message.type === "error"
              ? "bg-red-600 text-white"
              : "bg-slate-800 text-white"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Nasıl çalışır */}
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border border-orange-100 p-5">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2 mb-3">
            <span className="text-orange-500">💡</span> BuyBox Nedir ve Nasıl Çalışır?
          </h2>
          <div className="text-sm text-slate-700 space-y-2">
            <p>
              <strong>BuyBox</strong>, Trendyol&apos;da bir ürüne tıklayan müşterinin varsayılan olarak sizin teklifinizi görmesini sağlar.
              En uygun fiyatı sunan satıcı genelde BuyBox&apos;ı kazanır.
            </p>
            <p>
              Bu panel, ERP&apos;deki ürün maliyetlerinizi ve hedef kâr oranınızı kullanarak <strong>önerilen satış fiyatını</strong> hesaplar.
              İsterseniz &quot;Otomatik Güncelle&quot; ile bu fiyatlar doğrudan Trendyol&apos;a gönderilir.
            </p>
          </div>
        </div>

        {/* Stats + Kur */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">ERP Ürün</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{urunler.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">analiz edilebilir: {validCount}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Döviz Kuru</p>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-lg font-semibold text-slate-800">USD {formatRate(fx?.rates?.TRY ?? fx?.rates?.USDTRY)} ₺</span>
              <span className="text-slate-500">|</span>
              <span className="text-lg font-semibold text-slate-800">EUR {formatRate(eurTry(fx?.rates))} ₺</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">{fx?.date || "—"}</p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={fetchRates}
                disabled={fxLoading}
                className="text-xs px-2 py-1 border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50"
              >
                Yenile
              </button>
              <button
                onClick={updateRates}
                disabled={fxLoading}
                className="text-xs px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
              >
                Güncel Kur
              </button>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Son Analiz</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{results.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">ürün işlendi</p>
          </div>
        </div>

        {/* Fiyatlama Ayarları */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Fiyatlama Ayarları</h2>
            <p className="text-sm text-slate-500 mt-0.5">Hedef ve minimum kâr oranlarını belirleyin</p>
          </div>
          <div className="p-5 flex flex-wrap gap-6 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Hedef Kâr %</label>
              <input
                type="number"
                value={margin}
                onChange={(e) => setMargin(Number(e.target.value) || 0)}
                min="0"
                max="100"
                className="w-24 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-300 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Minimum Kâr %</label>
              <input
                type="number"
                value={minMargin}
                onChange={(e) => setMinMargin(Number(e.target.value) || 0)}
                min="0"
                max="100"
                className="w-24 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-300 focus:border-orange-500"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoUpdate}
                onChange={(e) => setAutoUpdate(e.target.checked)}
                className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
              />
              <span className="text-sm text-slate-700">Otomatik Güncelle (Trendyol&apos;a gönder)</span>
            </label>
            <div className="flex-1" />
            <div className="flex gap-3">
              <button
                onClick={runBuybox}
                disabled={loading || validCount === 0}
                className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition"
              >
                {loading ? "Hesaplanıyor…" : "BuyBox Analizi Yap"}
              </button>
              <button
                onClick={exportExcel}
                disabled={results.length === 0}
                className="px-5 py-2.5 border border-slate-300 hover:bg-slate-50 disabled:opacity-50 text-slate-700 font-medium rounded-lg transition"
              >
                Excel İndir
              </button>
            </div>
          </div>
        </div>

        {/* Tabs: Sonuçlar / Geçmiş */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab("sonuclar")}
              className={`px-6 py-4 text-sm font-medium ${
                activeTab === "sonuclar" ? "border-b-2 border-orange-600 text-orange-600" : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Sonuçlar ({results.length})
            </button>
            <button
              onClick={() => setActiveTab("gecmis")}
              className={`px-6 py-4 text-sm font-medium ${
                activeTab === "gecmis" ? "border-b-2 border-orange-600 text-orange-600" : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Geçmiş ({history.length})
            </button>
          </div>

          {activeTab === "sonuclar" && (
            <div className="overflow-x-auto">
              {results.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <p>Henüz analiz yapılmadı.</p>
                  <p className="text-sm mt-1">Fiyatlama ayarlarını girin ve &quot;BuyBox Analizi Yap&quot; butonuna tıklayın.</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left p-4 font-semibold text-slate-700">Barkod</th>
                      <th className="text-right p-4 font-semibold text-slate-700">Maliyet (₺)</th>
                      <th className="text-right p-4 font-semibold text-slate-700">Min Satış</th>
                      <th className="text-right p-4 font-semibold text-slate-700">Hedef Satış</th>
                      <th className="text-right p-4 font-semibold text-orange-600">Önerilen Fiyat</th>
                      <th className="text-right p-4 font-semibold text-slate-700">Stok</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr key={r.barcode} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="p-4 font-mono text-slate-800">{r.barcode}</td>
                        <td className="p-4 text-right">{fmt(r.costTL)}</td>
                        <td className="p-4 text-right">{fmt(r.minSell)}</td>
                        <td className="p-4 text-right">{fmt(r.targetSell)}</td>
                        <td className="p-4 text-right font-bold text-orange-600">{fmt(r.suggestedSalePrice)} ₺</td>
                        <td className="p-4 text-right">{r.stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === "gecmis" && (
            <div className="overflow-x-auto">
              {history.length === 0 ? (
                <div className="p-12 text-center text-slate-500">Geçmiş kayıt yok.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left p-4 font-semibold text-slate-700">Tarih</th>
                      <th className="text-left p-4 font-semibold text-slate-700">Barkod</th>
                      <th className="text-right p-4 font-semibold text-slate-700">Önerilen Fiyat</th>
                      <th className="text-right p-4 font-semibold text-slate-700">Kâr %</th>
                      <th className="text-center p-4 font-semibold text-slate-700">Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h._id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="p-4 text-slate-600">{new Date(h.date).toLocaleString("tr-TR")}</td>
                        <td className="p-4 font-mono text-slate-800">{h.barcode}</td>
                        <td className="p-4 text-right font-medium">{fmt(h.suggestedPrice)} ₺</td>
                        <td className="p-4 text-right">{h.margin != null ? `${Number(h.margin).toFixed(1)}%` : "—"}</td>
                        <td className="p-4 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            h.status === "Otomatik Güncellendi" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                          }`}>
                            {h.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        <p className="text-xs text-slate-500">
          Trendyol API ayarları için <Link href="/dashboard/api-settings?tab=trendyol" className="text-orange-600 hover:underline">API Ayarları</Link> sayfasını kullanın.
        </p>
      </div>
    </div>
  );
}
