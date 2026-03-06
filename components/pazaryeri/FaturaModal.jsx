"use client";

import { useState, useEffect } from "react";

/**
 * Sipariş satırından açılan E-arşiv fatura ekle/değiştir modalı (Hepsiburada örneği gibi).
 * orderNumber, marketplace, token, open, onClose
 */
export function FaturaModal({ open, onClose, orderNumber, marketplace, token }) {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);

  useEffect(() => {
    if (!open || !orderNumber || !marketplace || !token) {
      setInvoice(null);
      return;
    }
    setLoading(true);
    setInvoice(null);
    fetch(`/api/pazaryeri-fatura?orderNumber=${encodeURIComponent(orderNumber)}&marketplace=${encodeURIComponent(marketplace)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.invoice) setInvoice(d.invoice);
      })
      .finally(() => setLoading(false));
  }, [open, orderNumber, marketplace, token]);

  const handleUpload = () => {
    if (!file || !orderNumber || !marketplace || !token) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:application/pdf")) {
        alert("Lütfen PDF seçin.");
        return;
      }
      setUploading(true);
      fetch("/api/pazaryeri-fatura", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ marketplace, orderNumber, pdf: dataUrl }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.success) {
            setInvoice({ _id: d.id, orderNumber, marketplace, createdAt: new Date() });
            setFile(null);
          } else alert(d.message || "Yükleme başarısız");
        })
        .catch((e) => alert(e.message))
        .finally(() => setUploading(false));
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = () => {
    if (!invoice?._id || !token) return;
    fetch(`/api/pazaryeri-fatura/${invoice._id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `fatura-${orderNumber}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => alert("İndirilemedi"));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-slate-800 mb-2">E-arşiv fatura</h3>
        <p className="text-sm text-slate-600 mb-4">Sipariş: <span className="font-mono">{orderNumber}</span></p>

        {loading ? (
          <p className="text-slate-500">Kontrol ediliyor...</p>
        ) : invoice ? (
          <div className="space-y-3">
            <p className="text-sm text-green-700 font-medium">Bu siparişe fatura yüklü.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={handleDownload} className="px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600">
                PDF İndir
              </button>
              <label className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium cursor-pointer hover:bg-slate-200">
                Yeni yükle
                <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0])} />
              </label>
            </div>
            {file && (
              <button type="button" onClick={handleUpload} disabled={uploading} className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm disabled:opacity-50">
                {uploading ? "Yükleniyor..." : "Yükle (değiştir)"}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0])}
              className="block w-full text-sm text-slate-600 file:mr-2 file:py-2 file:px-3 file:rounded file:border file:border-slate-300"
            />
            <button type="button" onClick={handleUpload} disabled={!file || uploading} className="w-full py-2 bg-orange-500 text-white rounded-lg font-medium disabled:opacity-50">
              {uploading ? "Yükleniyor..." : "Fatura yükle (PDF)"}
            </button>
          </div>
        )}

        <button type="button" onClick={onClose} className="mt-4 w-full py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50">
          Kapat
        </button>
      </div>
    </div>
  );
}
