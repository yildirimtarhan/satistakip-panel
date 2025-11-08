"use client";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function BuyboxPanel() {
  const [loading, setLoading] = useState(false);
  const [fx, setFx] = useState(null);
  const [margin, setMargin] = useState(15);
  const [minMargin, setMinMargin] = useState(10);
  const [autoUpdate, setAutoUpdate] = useState(false);
  const [urunler, setUrunler] = useState([]);
  const [results, setResults] = useState([]);
  const [history, setHistory] = useState([]);

  // 🔹 Ürünleri getir
  const loadProducts = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const r = await fetch("/api/urunler", { headers: { Authorization: `Bearer ${token}` } });
      const data = await r.json();
      if (Array.isArray(data)) setUrunler(data);
    } catch (e) {
      console.error("Ürünler yüklenemedi:", e);
    }
  };

  // 🔹 Kur bilgisi
  const fetchRates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/currency/update");
      const data = await res.json();
      if (data?.ok) setFx(data.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const updateRates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/currency/update", { method: "POST" });
      const data = await res.json();
      if (data?.ok) setFx(data.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // 🔹 Analiz çalıştır
  const runBuybox = async () => {
    setLoading(true);
    try {
      const items = urunler.map((u) => ({
        barcode: u.barkod || u.barcode || `U${u._id}`,
        baseCurrency: u.doviz || "TRY",
        cost: Number(u.alisFiyati || u.maliyet || 0),
        stock: Number(u.stok || 0),
      }));

      const res = await fetch("/api/trendyol/buybox-monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoUpdate, marginPct: margin, minMarginPct: minMargin, items }),
      });
      const data = await res.json();
      if (data?.ok) {
        setResults(data.results);

        // 🔸 geçmişe kaydet
        for (const r of data.results) {
          await fetch("/api/trendyol/buybox-history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              barcode: r.barcode,
              suggestedPrice: r.suggestedSalePrice,
              margin: r.marginPct,
              status: autoUpdate ? "Otomatik Güncellendi" : "Analiz",
            }),
          });
        }

        fetchHistory();
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // 🔹 Excel dışa aktar
  const exportExcel = () => {
    if (results.length === 0) return alert("Henüz veri yok.");
    const ws = XLSX.utils.json_to_sheet(results);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BuyBox");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    saveAs(new Blob([buf]), `buybox-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // 🔹 Geçmişi getir
  const fetchHistory = async () => {
    try {
      const r = await fetch("/api/trendyol/buybox-history");
      const d = await r.json();
      if (d?.ok) setHistory(d.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadProducts();
    fetchRates();
    fetchHistory();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-orange-600">💱 Trendyol BuyBox Paneli</h1>

      {/* Kur bilgisi */}
      <div className="bg-white rounded-xl shadow p-4 border border-gray-200">
        <h2 className="text-lg font-semibold mb-2">Döviz Kuru</h2>
        {fx ? (
          <div className="text-sm text-gray-700">
            <p>📅 Tarih: {fx.date}</p>
            <p>💵 USD/TRY: {fx.rates?.TRY?.toFixed?.(2) || fx.rates?.USDTRY}</p>
            <p>💶 EUR/TRY: {(fx.rates?.EUR * fx.rates?.TRY)?.toFixed?.(2)}</p>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Kurlar yüklenmedi.</p>
        )}
        <div className="mt-3 flex gap-2">
          <button onClick={fetchRates} className="px-3 py-2 border rounded hover:bg-gray-100">
            🔄 Yenile
          </button>
          <button
            onClick={updateRates}
            className="px-3 py-2 rounded bg-orange-600 text-white hover:bg-orange-700"
          >
            🌍 Güncel Kur Al
          </button>
        </div>
      </div>

      {/* Fiyatlama */}
      <div className="bg-white rounded-xl shadow p-4 border border-gray-200 space-y-3">
        <h2 className="text-lg font-semibold mb-2">Fiyatlama Ayarları</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="number"
            value={margin}
            onChange={(e) => setMargin(e.target.value)}
            className="border p-2 rounded"
            placeholder="Hedef Kâr %"
          />
          <input
            type="number"
            value={minMargin}
            onChange={(e) => setMinMargin(e.target.value)}
            className="border p-2 rounded"
            placeholder="Minimum Kâr %"
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoUpdate}
              onChange={(e) => setAutoUpdate(e.target.checked)}
            />
            Otomatik Güncelle (Trendyol’a Gönder)
          </label>
        </div>

        <div className="flex gap-3 mt-3">
          <button
            onClick={runBuybox}
            disabled={loading}
            className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
          >
            {loading ? "⏳ Çalışıyor..." : "🚀 BuyBox Analizi Yap"}
          </button>
          <button onClick={exportExcel} className="px-4 py-2 border rounded hover:bg-gray-100">
            📤 Excel Dışa Aktar
          </button>
        </div>
      </div>

      {/* Sonuçlar */}
      {results.length > 0 && (
        <div className="bg-white rounded-xl shadow p-4 border border-gray-200 overflow-x-auto">
          <h2 className="text-lg font-semibold mb-3">Sonuçlar</h2>
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Barkod</th>
                <th className="p-2 text-right">Maliyet (TL)</th>
                <th className="p-2 text-right">Min Satış</th>
                <th className="p-2 text-right">Hedef Satış</th>
                <th className="p-2 text-right text-orange-600">Önerilen Fiyat</th>
                <th className="p-2 text-right">Stok</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.barcode} className="border-t hover:bg-gray-50">
                  <td className="p-2">{r.barcode}</td>
                  <td className="p-2 text-right">{r.costTL.toFixed(2)}</td>
                  <td className="p-2 text-right">{r.minSell.toFixed(2)}</td>
                  <td className="p-2 text-right">{r.targetSell.toFixed(2)}</td>
                  <td className="p-2 text-right font-bold text-orange-600">
                    {r.suggestedSalePrice.toFixed(2)} TL
                  </td>
                  <td className="p-2 text-right">{r.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 📜 Geçmiş kayıtlar */}
      {history.length > 0 && (
        <div className="bg-white rounded-xl shadow p-4 border border-gray-200">
          <h2 className="text-lg font-semibold mb-3">📜 Son 50 BuyBox Kaydı</h2>
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Tarih</th>
                <th className="p-2 text-left">Barkod</th>
                <th className="p-2 text-right">Önerilen Fiyat</th>
                <th className="p-2 text-right">Kâr (%)</th>
                <th className="p-2 text-center">Durum</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h._id} className="border-t hover:bg-gray-50">
                  <td className="p-2">{new Date(h.date).toLocaleString("tr-TR")}</td>
                  <td className="p-2">{h.barcode}</td>
                  <td className="p-2 text-right">{h.suggestedPrice.toFixed(2)} TL</td>
                  <td className="p-2 text-right">{h.margin?.toFixed?.(2) || "-"}%</td>
                  <td className="p-2 text-center text-emerald-600 font-medium">{h.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
