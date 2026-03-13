"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function HepsiburadaStoreAccountPage() {
  const [cargoFirms, setCargoFirms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch("/api/hepsiburada/cargo-firms", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setCargoFirms(d.cargoFirms || []);
        else setError(d.message || "Kargo firmaları yüklenemedi.");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-orange-600 mb-2">Hepsiburada Mağaza Hesabı</h1>
      <p className="text-slate-600 mb-6">
        Mağaza hesabı modelinde kendi carinizden kargo çıkış sürecini yönetirsiniz. Kargo firmaları ve teslimat seçenekleri.
      </p>

      <div className="mb-8 p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-700 space-y-2">
        <p><strong>Kargo seçenekleri:</strong> Kendi lojistik, anlaşmalı kargo veya Hepsiburada anlaşmalı kargo kullanılabilir.</p>
        <p><strong>Kargo durumları:</strong> Kargo çıkışında <code className="bg-white px-1 rounded">intransit</code>, teslimatta <code className="bg-white px-1 rounded">deliver</code> veya başarısız teslimatta <code className="bg-white px-1 rounded">undeliver</code> statüsü bildirilmelidir.</p>
        <p><strong>Test sonrası:</strong> Testler tamamlandıktan sonra Hepsiburada Satıcı Destek üzerinden ticket açarak canlı ortama geçiş talep edilir.</p>
      </div>

      <h2 className="text-lg font-semibold text-slate-800 mb-3">Kargo Firmaları</h2>
      {error && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">{error}</div>
      )}
      {loading ? (
        <p className="text-slate-500">Yükleniyor…</p>
      ) : cargoFirms.length === 0 ? (
        <p className="text-slate-500">Kargo firması bulunamadı. API ayarlarını kontrol edin.</p>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Kargo Firması</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cargoFirms.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm">{f.id}</td>
                  <td className="px-4 py-3 text-sm">{f.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <Link href="/dashboard/hepsiburada/orders" className="text-orange-600 hover:underline">
          Siparişler
        </Link>
        <Link href="/dashboard/api-settings" className="text-orange-600 hover:underline">
          API Ayarları
        </Link>
      </div>
    </div>
  );
}
