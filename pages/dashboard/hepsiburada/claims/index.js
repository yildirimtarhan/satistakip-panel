"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STATUS_OPTIONS = [
  { value: "NewRequest", label: "Yeni talep" },
  { value: "Accepted", label: "Kabul edildi" },
  { value: "AwaitingAction", label: "Aksiyon bekliyor" },
  { value: "InDispute", label: "İhtilaflı" },
  { value: "Rejected", label: "Reddedildi" },
  { value: "Refunded", label: "İade edildi" },
  { value: "Cancelled", label: "İptal" },
];

export default function HepsiburadaClaimsPage() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("NewRequest");
  const [acting, setActing] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchClaims = () => {
    const token = localStorage.getItem("token");
    setLoading(true);
    setError("");
    fetch(`/api/hepsiburada/claims?status=${encodeURIComponent(status)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setClaims(d.claims || []);
        else setError(d.message || "Talepler yüklenemedi.");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchClaims();
  }, [status]);

  const handleAccept = async (c) => {
    const claimNum = c.claimNumber ?? c.claimId ?? c.number ?? c.id;
    if (!claimNum) return;
    setActing(claimNum);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/hepsiburada/claims", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ claimNumber: claimNum, action: "accept" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Kabul başarısız");
      fetchClaims();
    } catch (e) {
      alert(e.message);
    }
    setActing(null);
  };

  const handleReject = async (c, reason) => {
    const claimNum = c.claimNumber ?? c.claimId ?? c.number ?? c.id;
    if (!claimNum) return;
    setActing(claimNum);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/hepsiburada/claims", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          claimNumber: claimNum,
          action: "reject",
          reason: reason || "Uygun görülmedi",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Red başarısız");
      fetchClaims();
    } catch (e) {
      alert(e.message);
    }
    setActing(null);
  };

  const getClaimNum = (c) => c.claimNumber ?? c.claimId ?? c.number ?? c.id ?? "—";
  const getOrderNum = (c) => c.orderNumber ?? c.orderId ?? "—";

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-orange-600 mb-2">Hepsiburada Talepler</h1>
      <p className="text-slate-600 mb-6">İade, değişim ve diğer müşteri taleplerini görüntüleyin, kabul veya reddedin.</p>

      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          onClick={fetchClaims}
          disabled={loading}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 text-sm"
        >
          Yenile
        </button>
        <Link href="/dashboard/hepsiburada/orders" className="text-orange-600 hover:underline py-2 text-sm">
          Siparişler
        </Link>
        <Link href="/dashboard/api-settings" className="text-orange-600 hover:underline py-2 text-sm">
          API Ayarları
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">{error}</div>
      )}

      <div className="space-y-4">
        {loading ? (
          <p className="text-slate-500">Yükleniyor…</p>
        ) : claims.length === 0 ? (
          <p className="text-slate-500">Bu statüde talep yok.</p>
        ) : (
          claims.map((c) => (
            <div key={getClaimNum(c)} className="bg-white rounded-xl border shadow-sm p-4">
              <div className="flex flex-wrap justify-between items-start gap-3">
                <div>
                  <p className="font-medium text-slate-800">Talep #{getClaimNum(c)}</p>
                  <p className="text-sm text-slate-600">Sipariş: {getOrderNum(c)}</p>
                  {c.claimType && <p className="text-sm text-slate-500">Tip: {c.claimType}</p>}
                  {c.description && <p className="text-sm mt-1">{c.description}</p>}
                </div>
                {status === "NewRequest" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(c)}
                      disabled={acting === getClaimNum(c)}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                    >
                      Kabul
                    </button>
                    <button
                      onClick={() => {
                        const r = window.prompt("Red gerekçesi (isteğe bağlı):");
                        if (r !== null) handleReject(c, r);
                      }}
                      disabled={acting === getClaimNum(c)}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
                    >
                      Red
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
