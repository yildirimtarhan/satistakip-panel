"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function TrendyolWebhookPage() {
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState("");

  const fetchWebhooks = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/trendyol/webhooks", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Webhook listesi alınamadı");
      setWebhooks(data.webhooks || []);
    } catch (e) {
      setError(e.message);
      setWebhooks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const handleCreate = async () => {
    setActionLoading(true);
    setMessage(null);
    setError("");
    try {
      const res = await fetch("/api/trendyol/webhooks", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.message || "Webhook oluşturulamadı";
        throw new Error(data?.hint ? `${msg} ${data.hint}` : msg);
      }
      setMessage({ type: "success", text: data.message + " URL: " + data.url });
      fetchWebhooks();
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Bu webhook silinsin mi?")) return;
    setActionLoading(true);
    setMessage(null);
    setError("");
    try {
      const res = await fetch(`/api/trendyol/webhooks?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Webhook silinemedi");
      setMessage({ type: "success", text: data.message });
      fetchWebhooks();
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/trendyol/webhook/orders`
    : "/api/trendyol/webhook/orders";

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-orange-600 mb-2">Webhook Entegrasyonu</h1>
      <p className="text-slate-600 mb-6">
        Trendyol sipariş bildirimlerini anlık almak için webhook kaydedin. Sipariş durumu değiştiğinde Trendyol bu adrese POST atar.
      </p>

      <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
        <p className="font-medium mb-1">Önemli:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Webhook URL&apos;niz <strong>localhost</strong>, <strong>Trendyol</strong> veya <strong>Dolap</strong> içeremez.</li>
          <li>Canlı kullanım için sunucunuzun dışarıdan erişilebilir (HTTPS) olması gerekir.</li>
          <li><code className="bg-amber-100 px-1 rounded">TRENDYOL_WEBHOOK_BASE_URL</code> veya <code className="bg-amber-100 px-1 rounded">NEXTAUTH_URL</code> tanımlı olmalı.</li>
        </ul>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-lg ${message.type === "success" ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 text-red-800"}`}>
          {message.text}
        </div>
      )}
      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
        <h2 className="font-semibold text-slate-800 mb-2">Webhook Endpoint</h2>
        <code className="block p-3 bg-slate-100 rounded-lg text-sm break-all">{webhookUrl}</code>
        <p className="text-xs text-slate-500 mt-2">
          Trendyol bu adrese POST atacak. Doğrulama: <code>x-api-key</code> header (TRENDYOL_WEBHOOK_SECRET veya TRENDYOL_API_KEY).
        </p>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          type="button"
          onClick={handleCreate}
          disabled={actionLoading || loading}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg font-medium"
        >
          {actionLoading ? "İşleniyor…" : "+ Webhook Oluştur"}
        </button>
        <button
          type="button"
          onClick={fetchWebhooks}
          disabled={loading}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
        >
          Yenile
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <h2 className="font-semibold text-slate-800 p-4 border-b">Kayıtlı Webhooklar (max 15)</h2>
        {loading ? (
          <p className="p-6 text-slate-500">Yükleniyor…</p>
        ) : webhooks.length === 0 ? (
          <p className="p-6 text-slate-500">Henüz webhook yok. Yukarıdaki &quot;Webhook Oluştur&quot; ile ekleyin.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {webhooks.map((w) => (
              <li key={w.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm text-slate-700">{w.url}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ID: {w.id} {w.status ? `| ${w.status}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(w.id)}
                  disabled={actionLoading}
                  className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                >
                  Sil
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        <Link href="/dashboard/trendyol/orders" className="text-orange-600 hover:underline font-medium">
          ← Siparişlere dön
        </Link>
        <Link href="/dashboard/api-settings?tab=trendyol" className="text-orange-600 hover:underline font-medium">
          API Ayarları
        </Link>
      </div>
    </div>
  );
}
