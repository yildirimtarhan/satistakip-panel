"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function N11AddProductPage() {
  const [products, setProducts] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [lastTask, setLastTask] = useState(null);
  const [checkingTask, setCheckingTask] = useState(false);

  const token = () => localStorage.getItem("token");

  const fetchERPProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products/list", {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      const list = data?.products || data?.data || data?.urunler || data?.items || [];
      setProducts(Array.isArray(list) ? list : []);
    } catch (err) {
      alert("ERP ürünleri alınamadı!");
    }
    setLoading(false);
  };

  useEffect(() => { fetchERPProducts(); }, []);

  const handleSendToN11 = async () => {
    if (!selectedId) { alert("Lütfen bir ürün seç!"); return; }
    try {
      setSending(true);
      setLastTask(null);
      const res = await fetch("/api/n11/products/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ productId: selectedId }),
      });
      const data = await res.json();
      if (data?.success) {
        setLastTask({ taskId: data.taskId, status: "IN_QUEUE", productId: selectedId });
      } else {
        alert(`N11 gönderim başarısız ❌\n${data?.message || "Bilinmeyen hata"}`);
      }
    } catch (err) {
      alert("N11 gönderim hatası: " + err.message);
    }
    setSending(false);
  };

  const checkTaskStatus = async () => {
    if (!lastTask?.taskId) return;
    setCheckingTask(true);
    try {
      const url = lastTask.productId
        ? `/api/n11/products/task-status?productId=${lastTask.productId}`
        : `/api/n11/products/task-status?taskId=${lastTask.taskId}`;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      setLastTask((prev) => ({ ...prev, status: data.status, reason: data.reason, raw: data.raw }));
    } catch (err) {
      alert("Durum sorgulanamadı: " + err.message);
    }
    setCheckingTask(false);
  };

  const statusColor = {
    IN_QUEUE: "text-yellow-600",
    COMPLETED: "text-green-600",
    FAILED: "text-red-600",
  };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">N11 Ürün Gönder</h1>

      <select
        className="w-full border p-2 rounded mb-4"
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
      >
        <option value="">Ürün seçin...</option>
        {products.map((p) => (
          <option key={p._id} value={p._id}>
            {p?.name || p?.title || "Ürün"} | {p?.sku || p?.barcode || p?.barkod || "SKU yok"}
          </option>
        ))}
      </select>

      <div className="flex gap-3 mb-6">
        <Button onClick={fetchERPProducts} disabled={loading}>
          {loading ? "Yükleniyor..." : "Yenile"}
        </Button>
        <Button
          onClick={handleSendToN11}
          disabled={sending || loading}
          className="bg-orange-600 hover:bg-orange-700 text-white"
        >
          {sending ? "Gönderiliyor..." : "N11'e Gönder"}
        </Button>
      </div>

      {lastTask && (
        <div className="border rounded p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-sm">Task Durumu</span>
            <Button onClick={checkTaskStatus} disabled={checkingTask} className="text-xs py-1 px-3">
              {checkingTask ? "Sorgulanıyor..." : "Durumu Sorgula"}
            </Button>
          </div>
          <div className="text-sm space-y-1">
            <div>Task ID: <span className="font-mono">{lastTask.taskId}</span></div>
            <div>Durum: <span className={`font-bold ${statusColor[lastTask.status] || "text-gray-600"}`}>{lastTask.status}</span></div>
            {lastTask.reason && <div className="text-red-500">Hata: {lastTask.reason}</div>}
            {lastTask.status === "COMPLETED" && (
              <div className="text-green-600 font-semibold">✅ N11 panelinde görünmeli!</div>
            )}
            {lastTask.status === "FAILED" && (
              <div className="text-red-600 font-semibold">❌ N11 reddetti. Ham yanıt:</div>
            )}
            {lastTask.raw && (
              <pre className="mt-2 text-xs bg-white border rounded p-2 overflow-auto max-h-40">
                {JSON.stringify(lastTask.raw, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
