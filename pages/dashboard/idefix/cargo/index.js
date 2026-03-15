"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function IdefixCargoPage() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    fetch("/api/idefix/vendor/cargo-profile/list", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.profiles)) setProfiles(d.profiles);
        else if (!d.success) setError(d.message || "Profil listesi alınamadı.");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-amber-700 mb-2">İdefix Kargo Şablonu</h1>
      <p className="text-sm text-gray-500 mb-6">
        Satıcıya tanımlı kargo profilleri. Siparişlerde kargo seçimi ve update-tracking-number / change-cargo-provider işlemlerinde kullanılır.
      </p>
      <Link href="/dashboard/api-settings?tab=idefix" className="text-amber-600 hover:underline text-sm mb-4 inline-block">API Ayarları</Link>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">{error}</div>}
      {loading ? (
        <div className="text-gray-500 py-8">Yükleniyor...</div>
      ) : profiles.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 p-8 rounded-lg text-gray-600 text-center">Kargo profili bulunamadı veya API ayarlarınızı kontrol edin.</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 text-sm font-medium text-gray-600">ID</th>
                <th className="text-left p-3 text-sm font-medium text-gray-600">Profil / Kargo</th>
                <th className="text-left p-3 text-sm font-medium text-gray-600">Takip / Anlaşma</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3 text-sm">{p.id}</td>
                  <td className="p-3 text-sm">{p.title ?? p.cargoCompany?.title ?? "—"}</td>
                  <td className="p-3 text-sm">
                    {p.isSellerTrackingSupport ? "Satıcı takip " : ""}
                    {p.isPlatformAgreementSupport ? "Platform öder " : ""}
                    {!p.isSellerTrackingSupport && !p.isPlatformAgreementSupport ? "Alternatif" : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
