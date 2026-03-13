"use client";

import { useState } from "react";
import Link from "next/link";

export default function HepsiburadaDeliveryPage() {
  const [packageNumber, setPackageNumber] = useState("");
  const [action, setAction] = useState("intransit");
  const [barcode, setBarcode] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState({ ok: null, msg: "" });

  const submit = async () => {
    if (!packageNumber.trim()) {
      setResult({ ok: false, msg: "Paket numarası girin." });
      return;
    }
    setLoading(true);
    setResult({ ok: null, msg: "" });
    const token = localStorage.getItem("token");
    const body = {
      action,
      packageNumber: packageNumber.trim(),
      barcode: barcode.trim() || undefined,
      trackingInfoCode: trackingCode.trim() || undefined,
      trackingInfoUrl: trackingUrl.trim() || undefined,
    };
    try {
      const res = await fetch("/api/hepsiburada/delivery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ ok: true, msg: data.message || "İşlem başarılı." });
        setPackageNumber("");
        setBarcode("");
        setTrackingCode("");
        setTrackingUrl("");
      } else {
        setResult({ ok: false, msg: data.message || "İşlem başarısız." });
      }
    } catch (e) {
      setResult({ ok: false, msg: e.message });
    }
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-orange-600 mb-2">Hepsiburada Teslimat Bildirimi</h1>
      <p className="text-slate-600 mb-6">
        Paket durumunu Hepsiburada’ya bildirin: kargoya verildi, teslim edildi veya teslim edilemedi.
      </p>

      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Paket numarası *</label>
          <input
            type="text"
            value={packageNumber}
            onChange={(e) => setPackageNumber(e.target.value)}
            placeholder="Örn: 013105889"
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">İşlem</label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="intransit">Kargoya verildi (Intransit)</option>
            <option value="deliver">Teslim edildi (Deliver)</option>
            <option value="undeliver">Teslim edilemedi (Undeliver)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Barkod (isteğe bağlı)</label>
          <input
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Kargo barkod"
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>

        {action === "intransit" && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Takip kodu</label>
              <input
                type="text"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                placeholder="Kargo takip no"
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Takip URL</label>
              <input
                type="url"
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                placeholder="https://..."
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </>
        )}

        <button
          onClick={submit}
          disabled={loading}
          className="w-full py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 font-medium"
        >
          {loading ? "Gönderiliyor…" : "Bildir"}
        </button>

        {result.msg && (
          <div
            className={`p-3 rounded-lg text-sm ${
              result.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
            }`}
          >
            {result.msg}
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        <Link href="/dashboard/hepsiburada/orders" className="text-orange-600 hover:underline">
          Siparişler
        </Link>
        <Link href="/dashboard/hepsiburada/store-account" className="text-orange-600 hover:underline">
          Mağaza Hesabı
        </Link>
        <Link href="/dashboard/api-settings" className="text-orange-600 hover:underline">
          API Ayarları
        </Link>
      </div>
    </div>
  );
}
