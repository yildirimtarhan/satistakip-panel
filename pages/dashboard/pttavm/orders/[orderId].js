"use client";

import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Link from "next/link";

/** PTT AVM sipariş detay – multi-tenant. */
export default function PttAvmOrderDetailPage() {
  const router = useRouter();
  const { orderId } = router.query;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    const run = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Giriş yapmanız gerekiyor.");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/pttavm/orders/${encodeURIComponent(orderId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.message || "Sipariş alınamadı.");
        const raw = data.order;
        setOrder(Array.isArray(raw) ? raw[0] : raw);
      } catch (e) {
        if (!cancelled) {
          setError(e.message);
          setOrder(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [orderId]);

  if (!orderId) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/pttavm/orders" className="text-orange-600 hover:underline">← Sipariş listesi</Link>
        <h1 className="text-2xl font-bold text-orange-600">Sipariş: {orderId}</h1>
      </div>

      {error && <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">{error}</div>}
      {loading ? (
        <div className="text-gray-500 py-8">Yükleniyor...</div>
      ) : order ? (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <pre className="p-4 text-sm text-gray-800 overflow-auto max-h-[70vh]">{JSON.stringify(order, null, 2)}</pre>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 p-8 rounded-lg text-gray-600 text-center">Sipariş bulunamadı.</div>
      )}
    </div>
  );
}
