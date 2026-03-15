"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

/** PTT AVM kargo şablonu (kargo profil listesi). */
export default function PttAvmShippingPage() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Giriş yapmanız gerekiyor.");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/pttavm/shipping/cargo-profiles", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.message || "Kargo profilleri alınamadı.");
          setProfiles([]);
          setLoading(false);
          return;
        }
        setProfiles(Array.isArray(data.cargoProfiles) ? data.cargoProfiles : []);
      } catch (e) {
        if (!cancelled) {
          setError(e.message || "Bağlantı hatası.");
          setProfiles([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-orange-600 mb-2">PTT AVM Kargo Şablonu</h1>
      <p className="text-gray-500 mb-6">
        Sipariş entegrasyonunda kullanılan kargo profil listesi. API Ayarları → PTT AVM bağlantınız ile alınır.
      </p>

      {error && (
        <div className="mb-6 p-4 rounded-xl border bg-orange-50 border-orange-200 text-orange-800">
          <p className="font-medium mb-2">▲ {error}</p>
          <Link href="/dashboard/api-settings?tab=pttavm" className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium">
            API Ayarları → PTT AVM
          </Link>
        </div>
      )}

      {loading ? (
        <div className="text-gray-500 py-8">Yükleniyor...</div>
      ) : profiles.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 p-8 rounded-lg text-gray-600 text-center">
          Kargo profili bulunamadı veya API ayarlarını kontrol edin.
        </div>
      ) : (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left p-3 text-sm font-semibold text-gray-700">ID</th>
                <th className="text-left p-3 text-sm font-semibold text-gray-700">Ad</th>
                <th className="text-left p-3 text-sm font-semibold text-gray-700">Açıklama</th>
                <th className="text-left p-3 text-sm font-semibold text-gray-700">Tip</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p, i) => (
                <tr key={p.id ?? i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3 font-mono text-sm text-gray-700">{p.id ?? "—"}</td>
                  <td className="p-3 text-gray-800">{p.name ?? "—"}</td>
                  <td className="p-3 text-gray-600">{p.description ?? "—"}</td>
                  <td className="p-3 text-gray-600">{p.type ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-4 text-sm text-gray-500">Toplam {profiles.length} kargo profili</p>
    </div>
  );
}
