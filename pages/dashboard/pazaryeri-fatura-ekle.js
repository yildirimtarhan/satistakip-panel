"use client";

import { useState, useEffect } from "react";

const MARKETPLACES = [
  { value: "hepsiburada", label: "Hepsiburada" },
  { value: "n11", label: "N11" },
  { value: "trendyol", label: "Trendyol" },
];

export default function PazaryeriFaturaEklePage() {
  const [marketplace, setMarketplace] = useState("hepsiburada");
  const [orderNumber, setOrderNumber] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [list, setList] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const fetchList = () => {
    if (!token) return;
    setLoadingList(true);
    fetch("/api/pazaryeri-fatura", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.list) setList(d.list);
      })
      .finally(() => setLoadingList(false));
  };

  useEffect(() => {
    fetchList();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!orderNumber.trim() || !file) {
      alert("Pazaryeri, sipariş numarası ve PDF dosyası seçin.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:application/pdf")) {
        alert("Lütfen PDF dosyası seçin.");
        return;
      }
      setUploading(true);
      try {
        const res = await fetch("/api/pazaryeri-fatura", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            marketplace,
            orderNumber: orderNumber.trim(),
            pdf: dataUrl,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setOrderNumber("");
          setFile(null);
          fetchList();
          alert("Fatura yüklendi.");
        } else {
          alert(data.message || "Yükleme başarısız");
        }
      } catch (err) {
        alert(err.message || "Yükleme hatası");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = async (id, orderNumber) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/pazaryeri-fatura/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("İndirilemedi");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pazaryeri-fatura-${orderNumber || id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message || "PDF indirilemedi");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-orange-600 mb-2">Pazaryeri Fatura Ekle</h1>
      <p className="text-slate-600 mb-6">
        Pazaryeri siparişlerinize ait fatura PDF’lerini yükleyin. Sipariş numarası ile eşleştirilir.
      </p>

      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <h2 className="font-semibold text-slate-800 mb-4">PDF Fatura Yükle</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Pazaryeri</label>
            <select
              value={marketplace}
              onChange={(e) => setMarketplace(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full max-w-xs"
            >
              {MARKETPLACES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Sipariş numarası</label>
            <input
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="Örn. HB-12345, 12345678"
              className="border rounded-lg px-3 py-2 w-full max-w-xs"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fatura PDF</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="border rounded-lg px-3 py-2 w-full max-w-md"
            />
          </div>
          <button
            type="submit"
            disabled={uploading || !file || !orderNumber.trim()}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg"
          >
            {uploading ? "Yükleniyor..." : "Fatura Yükle"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="font-semibold text-slate-800 mb-4">Yüklenen Faturalar</h2>
        {loadingList ? (
          <p className="text-slate-500">Yükleniyor...</p>
        ) : list.length === 0 ? (
          <p className="text-slate-500">Henüz fatura yüklenmedi.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-2 text-sm font-semibold text-slate-700">Pazaryeri</th>
                  <th className="text-left px-4 py-2 text-sm font-semibold text-slate-700">Sipariş no</th>
                  <th className="text-left px-4 py-2 text-sm font-semibold text-slate-700">Tarih</th>
                  <th className="text-right px-4 py-2 text-sm font-semibold text-slate-700">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {list.map((item) => (
                  <tr key={item._id} className="border-t border-slate-100">
                    <td className="px-4 py-2">{MARKETPLACES.find((m) => m.value === item.marketplace)?.label || item.marketplace}</td>
                    <td className="px-4 py-2 font-mono text-sm">{item.orderNumber}</td>
                    <td className="px-4 py-2 text-sm text-slate-600">
                      {item.createdAt ? new Date(item.createdAt).toLocaleString("tr-TR") : "—"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleDownload(item._id, item.orderNumber)}
                        className="text-orange-600 hover:underline text-sm font-medium"
                      >
                        PDF İndir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
