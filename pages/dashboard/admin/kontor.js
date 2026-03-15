"use client";
// 📁 pages/dashboard/admin/kontor.js
// Admin: Kullanıcı kontör yönetimi
import { useEffect, useState } from "react";

export default function AdminKontorPage() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTenant, setSelectedTenant] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [addNote, setAddNote] = useState("");
  const [adding, setAdding] = useState(false);

  const getToken = () => localStorage.getItem("token");

  const fetchTenants = async () => {
    try {
      const res = await fetch("/api/admin/kontor", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Liste alınamadı");
        return;
      }
      setTenants(data.tenants || []);
      setError("");
    } catch (err) {
      setError("Sunucu hatası");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleAddKontor = async () => {
    const amt = parseInt(addAmount, 10);
    if (!amt || amt <= 0) {
      alert("Geçerli miktar girin");
      return;
    }
    if (!selectedTenant) {
      alert("Kullanıcı seçin");
      return;
    }

    setAdding(true);
    try {
      const [type, id] = selectedTenant.split(":");
      const body =
        type === "company"
          ? { targetCompanyId: id, amount: amt, note: addNote }
          : { targetUserId: id, amount: amt, note: addNote };

      const res = await fetch("/api/admin/kontor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (res.ok) {
        setAddAmount("");
        setAddNote("");
        setSelectedTenant("");
        fetchTenants();
        alert("✅ " + data.message);
      } else {
        alert(data.message || "Kontör eklenemedi");
      }
    } catch (e) {
      alert(e.message || "Hata oluştu");
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">🧾 Kontör Yönetimi</h1>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">🧾 Kontör Yönetimi</h1>
      <p className="text-slate-600">
        Kullanıcıların E-Fatura kontörünü görüntüleyin ve yönetin.
      </p>

      {error && <p className="text-red-500">{error}</p>}

      {/* Kontör ekle formu */}
      <div className="bg-white rounded-xl shadow p-6 max-w-2xl">
        <h2 className="font-semibold text-slate-800 mb-4">Kontör Ekle</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm text-slate-600 mb-1">Kullanıcı / Firma</label>
            <select
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">Seçin...</option>
              {tenants.map((t) => (
                <option
                  key={t.tenantId}
                  value={t.companyId ? `company:${t.companyId}` : `user:${t.userId}`}
                >
                  {t.displayName} ({t.email}) — Kalan: {t.remaining ?? "—"}
                </option>
              ))}
            </select>
          </div>
          <div className="w-24">
            <label className="block text-sm text-slate-600 mb-1">Miktar</label>
            <input
              type="number"
              min="1"
              placeholder="Adet"
              value={addAmount}
              onChange={(e) => setAddAmount(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="block text-sm text-slate-600 mb-1">Not (opsiyonel)</label>
            <input
              type="text"
              placeholder="Örn: Taxten satın alma"
              value={addNote}
              onChange={(e) => setAddNote(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <button
            onClick={handleAddKontor}
            disabled={adding}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-70 font-medium"
          >
            {adding ? "Ekleniyor…" : "Kontör Ekle"}
          </button>
        </div>
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-100">
              <tr>
                <th className="text-left p-3 font-semibold text-slate-700">Kullanıcı / Firma</th>
                <th className="text-left p-3 font-semibold text-slate-700">Email</th>
                <th className="text-right p-3 font-semibold text-slate-700">Kullanılan</th>
                <th className="text-right p-3 font-semibold text-slate-700">Limit / Yüklenen</th>
                <th className="text-right p-3 font-semibold text-slate-700">Kalan</th>
                <th className="text-center p-3 font-semibold text-slate-700">Durum</th>
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-slate-500 text-center">
                    Henüz kullanıcı bulunamadı.
                  </td>
                </tr>
              ) : (
                tenants.map((t) => {
                  const isLow = t.hasLimit && t.remaining != null && t.remaining <= 10 && t.remaining > 0;
                  const isExhausted = t.hasLimit && t.remaining != null && t.remaining <= 0;
                  return (
                    <tr key={t.tenantId} className="border-t hover:bg-slate-50">
                      <td className="p-3 font-medium">{t.displayName}</td>
                      <td className="p-3 text-slate-600">{t.email}</td>
                      <td className="p-3 text-right">{t.used ?? 0}</td>
                      <td className="p-3 text-right">{t.limit ?? "—"}</td>
                      <td className="p-3 text-right font-medium">
                        {t.remaining != null ? t.remaining : "—"}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-block px-2 py-1 rounded text-sm font-medium ${
                            isExhausted
                              ? "bg-red-100 text-red-700"
                              : isLow
                              ? "bg-amber-100 text-amber-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {isExhausted ? "Tükenmiş" : isLow ? "Az" : "Yeterli"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
