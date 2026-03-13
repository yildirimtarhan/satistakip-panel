"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function TrendyolSellerInfoPage() {
  const [supplier, setSupplier] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch("/api/trendyol/supplier", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setSupplier(d.supplier);
          setAddresses(d.addresses ?? (Array.isArray(d.supplier) ? d.supplier : []));
        } else setError(d.message || "Satıcı bilgisi alınamadı.");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-orange-600 mb-2">Satıcı Bilgileri</h1>
      <p className="text-slate-600 mb-6">Trendyol mağaza bilgilerinizi görüntüleyin.</p>
      <div className="flex gap-3 mb-6">
        <Link href="/dashboard/trendyol/orders" className="text-orange-600 hover:underline">
          Siparişler
        </Link>
        <Link href="/dashboard/api-settings?tab=trendyol" className="text-orange-600 hover:underline">
          API Ayarları
        </Link>
      </div>
      {error && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
          {error}
        </div>
      )}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        {loading ? (
          <p className="text-slate-500">Yükleniyor…</p>
        ) : supplier || addresses.length > 0 ? (
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-800">Teslimat, İade ve Fatura Adresleri</h3>
            {(addresses.length ? addresses : (Array.isArray(supplier) ? supplier : [supplier])).map((addr, i) => (
              <div key={addr?.id ?? i} className="border rounded-lg p-3 bg-slate-50">
                <p className="text-sm font-medium text-slate-700">{addr?.addressType ?? addr?.type ?? "Adres"}</p>
                <p className="text-sm text-slate-600">{addr?.fullAddress ?? addr?.address1 ?? JSON.stringify(addr)}</p>
              </div>
            ))}
            {!addresses.length && supplier && !Array.isArray(supplier) && (
              <pre className="text-sm text-slate-700 overflow-auto bg-slate-50 p-4 rounded-lg">
                {JSON.stringify(supplier, null, 2)}
              </pre>
            )}
          </div>
        ) : (
          <p className="text-slate-500">Veri yok.</p>
        )}
      </div>
    </div>
  );
}
