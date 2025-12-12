// 📁 /pages/dashboard/admin/efatura-basvurular.js
"use client";

import { useEffect, useState } from "react";

const statusColor = (s) => {
  if (s === "approved") return "text-green-600";
  if (s === "rejected") return "text-red-600";
  return "text-orange-600";
};

export default function AdminEFaturaBasvurular() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/efatura-applications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setList(data.applications || []);
    } catch (err) {
      console.error("Admin başvuru listesi alınamadı:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateStatus = async (id, status) => {
    const adminNote = prompt(
      status === "approved"
        ? "Onay notu (opsiyonel):"
        : "Red gerekçesi (zorunlu değil ama önerilir):",
      ""
    );

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/efatura-applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, status, adminNote }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Güncellenemedi");
        return;
      }

      fetchData();
    } catch (err) {
      console.error(err);
      alert("Sunucu hatası");
    }
  };

  if (loading) return <div className="p-6">Yükleniyor...</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-orange-600">
        🧾 E-Fatura / E-Arşiv Başvuruları (Admin)
      </h1>

      {list.length === 0 && (
        <div className="bg-white p-6 rounded-xl shadow text-slate-600">
          Henüz başvuru bulunmuyor.
        </div>
      )}

      {list.length > 0 && (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-orange-100">
              <tr>
                <th className="px-3 py-2 text-left">Tarih</th>
                <th className="px-3 py-2 text-left">Kullanıcı</th>
                <th className="px-3 py-2 text-left">Modüller</th>
                <th className="px-3 py-2 text-left">Durum</th>
                <th className="px-3 py-2 text-left">Admin Notu</th>
                <th className="px-3 py-2 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {list.map((b) => (
                <tr key={b._id} className="border-b hover:bg-slate-50">
                  <td className="px-3 py-2">
                    {b.createdAt
                      ? new Date(b.createdAt).toLocaleString("tr-TR")
                      : "-"}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {/* Şimdilik sadece userId gösteriyoruz; istersen buraya mail de ekleriz */}
                    {b.userId}
                  </td>
                  <td className="px-3 py-2">
                    {b.modules?.efatura && "E-Fatura "}
                    {b.modules?.earsiv && "• E-Arşiv "}
                    {b.modules?.eirsaliye && "• E-İrsaliye"}
                  </td>
                  <td className={`px-3 py-2 font-semibold ${statusColor(b.status)}`}>
                    {b.status === "approved"
                      ? "Onaylandı"
                      : b.status === "rejected"
                      ? "Reddedildi"
                      : "İncelemede"}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {b.adminNote || "-"}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex gap-2 justify-center">
                      <button
                        className="px-3 py-1 rounded bg-green-600 text-white text-xs"
                        onClick={() => updateStatus(b._id, "approved")}
                      >
                        Onayla
                      </button>
                      <button
                        className="px-3 py-1 rounded bg-red-600 text-white text-xs"
                        onClick={() => updateStatus(b._id, "rejected")}
                      >
                        Reddet
                      </button>
                    </div>
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
